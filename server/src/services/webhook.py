"""Webhook service — send notifications to external services."""

import hashlib
import hmac
import json
import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import Webhook

logger = logging.getLogger(__name__)

SUPPORTED_EVENTS = [
    "agent.created",
    "agent.revoked",
    "agent.denied",
    "limit.approaching",
    "limit.reached",
    "approval.requested",
    "approval.decided",
    "chain.broken",
]


class WebhookService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        project_id: str,
        name: str,
        url: str,
        events: list[str],
        secret: str | None = None,
    ) -> dict:
        """Create a new webhook configuration."""
        for event in events:
            if event not in SUPPORTED_EVENTS and event != "*":
                raise ValueError(
                    f"Unsupported event: {event}. Supported: {', '.join(SUPPORTED_EVENTS)}"
                )

        webhook = Webhook(
            project_id=project_id,
            name=name,
            url=url,
            events=events,
            secret=secret,
        )
        self._db.add(webhook)
        await self._db.flush()
        return self._to_dict(webhook)

    async def list_webhooks(self, project_id: str) -> list[dict]:
        """List all webhooks for a project."""
        result = await self._db.execute(
            select(Webhook)
            .where(Webhook.project_id == project_id)
            .order_by(Webhook.created_at.desc())
        )
        return [self._to_dict(w) for w in result.scalars().all()]

    async def delete(self, project_id: str, webhook_id: int) -> bool:
        """Delete a webhook. Returns False if not found."""
        result = await self._db.execute(
            select(Webhook).where(
                Webhook.id == webhook_id, Webhook.project_id == project_id
            )
        )
        webhook = result.scalar_one_or_none()
        if webhook is None:
            return False
        await self._db.delete(webhook)
        return True

    async def fire(self, project_id: str, event: str, data: dict) -> None:
        """Fire webhooks for a project event. Non-blocking."""
        try:
            result = await self._db.execute(
                select(Webhook).where(
                    Webhook.project_id == project_id,
                    Webhook.active == True,  # noqa: E712
                )
            )
            webhooks = result.scalars().all()

            for webhook in webhooks:
                if "*" in webhook.events or event in webhook.events:
                    await self._send(webhook, event, data)
        except Exception as e:
            logger.error(f"Webhook fire failed for {project_id}/{event}: {e}")

    async def _send(self, webhook: Webhook, event: str, data: dict) -> None:
        """Send a webhook payload."""
        # Re-validate URL at send time to prevent DNS rebinding
        from src.core.validators import validate_webhook_url

        try:
            validate_webhook_url(webhook.url)
        except ValueError as e:
            logger.warning(f"Webhook {webhook.id} URL failed re-validation: {e}")
            return

        payload = json.dumps(
            {
                "event": event,
                "data": data,
                "project_id": webhook.project_id,
                "timestamp": str(data.get("timestamp", "")),
            },
            default=str,
        )

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "AgentsID-Webhook/1.0",
            "X-AgentsID-Event": event,
        }

        # Sign payload if secret is set
        if webhook.secret:
            signature = hmac.new(
                webhook.secret.encode(), payload.encode(), hashlib.sha256
            ).hexdigest()
            headers["X-AgentsID-Signature"] = f"sha256={signature}"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    webhook.url, content=payload, headers=headers
                )
                if response.status_code >= 400:
                    logger.warning(
                        f"Webhook {webhook.id} returned {response.status_code}"
                    )
        except Exception as e:
            logger.error(f"Webhook {webhook.id} delivery failed: {e}")

    @staticmethod
    def _to_dict(w: Webhook) -> dict:
        return {
            "id": w.id,
            "name": w.name,
            "url": w.url,
            "events": w.events,
            "active": w.active,
            "created_at": str(w.created_at),
        }
