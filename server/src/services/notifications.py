"""Notification service — sends emails via Resend for important events."""

import logging
from html import escape

import resend

from src.core.config import settings

logger = logging.getLogger(__name__)


def _send_email(to: str, subject: str, html: str) -> None:
    """Send an email via Resend. Non-blocking, never raises."""
    if not settings.resend_api_key:
        logger.info(f"EMAIL (no key configured): to={to} subject={subject}")
        return

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.email_from,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent: to={to} subject={subject}")
    except Exception as e:
        logger.error(f"Email failed: to={to} subject={subject} error={e}")


async def notify_approaching_limit(project_id: str, email: str, usage: dict) -> None:
    """Notify when project approaches usage limit (80%)."""
    events = usage.get("events_this_month", 0)
    limit = usage.get("events_limit", 0)
    pct = round(events / max(limit, 1) * 100)

    safe_project_id = escape(project_id)

    _send_email(
        to=email,
        subject=f"AgentsID: You've used {pct}% of your monthly events",
        html=f"""
        <h2>Approaching Usage Limit</h2>
        <p>Your project <strong>{safe_project_id}</strong> has used <strong>{events:,}</strong> of <strong>{limit:,}</strong> monthly auth events ({pct}%).</p>
        <p>When you hit the limit, agent validation calls will be blocked.</p>
        <p><a href="https://agentsid.dev/dashboard">View your dashboard</a> | <a href="https://agentsid.dev/docs#pricing">Upgrade your plan</a></p>
        <p style="color:#999;font-size:12px;">— AgentsID</p>
        """,
    )


async def notify_limit_reached(project_id: str, email: str, usage: dict) -> None:
    """Notify when project hits usage limit."""
    safe_project_id = escape(project_id)

    _send_email(
        to=email,
        subject="AgentsID: Monthly event limit reached",
        html=f"""
        <h2>Usage Limit Reached</h2>
        <p>Your project <strong>{safe_project_id}</strong> has reached its monthly event limit.</p>
        <p><strong>Agent validation calls are now being blocked.</strong></p>
        <p>Upgrade to Pro ($49/mo) for 25,000 events/month:</p>
        <p><a href="https://agentsid.dev/dashboard">Upgrade now</a></p>
        <p style="color:#999;font-size:12px;">— AgentsID</p>
        """,
    )


async def notify_agent_expiring(project_id: str, email: str, agent_name: str, expires_at: str) -> None:
    """Notify when an agent token is about to expire."""
    safe_agent_name = escape(agent_name)
    safe_project_id = escape(project_id)
    safe_expires_at = escape(expires_at)

    _send_email(
        to=email,
        subject=f"AgentsID: Agent '{safe_agent_name}' expires soon",
        html=f"""
        <h2>Agent Expiring Soon</h2>
        <p>Your agent <strong>{safe_agent_name}</strong> in project <strong>{safe_project_id}</strong> will expire at <strong>{safe_expires_at}</strong>.</p>
        <p>Refresh the token to keep it running:</p>
        <p><a href="https://agentsid.dev/dashboard">Manage agents</a></p>
        <p style="color:#999;font-size:12px;">— AgentsID</p>
        """,
    )


async def notify_security_alert(project_id: str, email: str, alert_type: str, details: str) -> None:
    """Notify on security events."""
    safe_alert_type = escape(alert_type)
    safe_project_id = escape(project_id)
    safe_details = escape(details)

    _send_email(
        to=email,
        subject=f"AgentsID Security Alert: {safe_alert_type}",
        html=f"""
        <h2 style="color:#dc2626;">Security Alert</h2>
        <p><strong>Type:</strong> {safe_alert_type}</p>
        <p><strong>Project:</strong> {safe_project_id}</p>
        <p><strong>Details:</strong> {safe_details}</p>
        <p><a href="https://agentsid.dev/dashboard">Check your dashboard</a></p>
        <p style="color:#999;font-size:12px;">— AgentsID</p>
        """,
    )
