"""Webhook management routes."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.auth_dep import get_project
from src.core.database import get_db
from src.core.validators import validate_webhook_url as _validate_webhook_url
from src.models.models import Project, Webhook
from src.services.webhook import WebhookService

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
limiter = Limiter(key_func=get_remote_address)


class WebhookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=2000)
    events: list[str] = Field(..., min_length=1)
    secret: str | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        return _validate_webhook_url(v)


@router.post("/", status_code=201)
@limiter.limit("10/minute")
async def create_webhook(
    request: Request,
    data: WebhookCreate,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    svc = WebhookService(db)
    try:
        result = await svc.create(
            project.id, data.name, data.url, data.events, data.secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return result


@router.get("/")
@limiter.limit("60/minute")
async def list_webhooks(
    request: Request,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    svc = WebhookService(db)
    return await svc.list_webhooks(project.id)


@router.delete("/{webhook_id}", status_code=204)
@limiter.limit("10/minute")
async def delete_webhook(
    request: Request,
    webhook_id: int,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    svc = WebhookService(db)
    if not await svc.delete(project.id, webhook_id):
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.commit()


@router.post("/test")
@limiter.limit("10/minute")
async def test_webhook(
    request: Request,
    data: WebhookCreate,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Send a test webhook payload."""
    svc = WebhookService(db)
    test_wh = Webhook(
        project_id=project.id,
        name="test",
        url=data.url,
        events=data.events,
        secret=data.secret,
    )
    await svc._send(test_wh, "test.ping", {"message": "Webhook test from AgentsID"})
    return {"sent": True, "url": data.url}
