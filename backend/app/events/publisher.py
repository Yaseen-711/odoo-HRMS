"""Centralized event publisher for Redis Pub/Sub."""

import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

from app.core.config import settings
from app.events.schemas import DashboardEvent

logger = logging.getLogger(__name__)

REDIS_CHANNEL = "hrms:dashboard"


async def publish_event(
    event_type: str,
    employee_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
) -> bool:
    """
    Publish lightweight realtime event to Redis channel 'hrms:dashboard'.
    Catches and logs any Redis failure without throwing an exception or affecting DB state.
    """
    event = DashboardEvent(
        event=event_type,
        employee_id=employee_id,
        user_id=user_id,
        status=status,
        details=details,
    )
    payload = event.model_dump_json()

    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.publish(REDIS_CHANNEL, payload)
        await client.aclose()
        logger.info("Published realtime event type=%s channel=%s", event_type, REDIS_CHANNEL)
        return True
    except Exception as e:
        logger.error(
            "Failed to publish realtime event type=%s to Redis: %s",
            event_type,
            str(e),
        )
        return False
