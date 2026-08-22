"""Redis Pub/Sub subscriber background task for WebSocket broadcasting."""

import asyncio
import json
import logging

import redis.asyncio as redis

from app.core.config import settings
from app.realtime.manager import manager

logger = logging.getLogger(__name__)

REDIS_CHANNEL = "hrms:dashboard"


async def start_redis_subscriber() -> None:
    """
    Long-lived background task subscribing to Redis Pub/Sub channel 'hrms:dashboard'.
    Retries gracefully on connection failures without crashing the application.
    """
    logger.info("Starting Redis Pub/Sub subscriber task for channel=%s", REDIS_CHANNEL)

    while True:
        try:
            client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.subscribe(REDIS_CHANNEL)
            logger.info("Successfully subscribed to Redis channel=%s", REDIS_CHANNEL)

            async for message in pubsub.listen():
                if message and message.get("type") == "message":
                    data_raw = message.get("data")
                    if isinstance(data_raw, str):
                        try:
                            event_dict = json.loads(data_raw)
                            await manager.broadcast_event(event_dict)
                        except json.JSONDecodeError:
                            logger.error("Failed to decode JSON Pub/Sub message: %s", data_raw)
        except asyncio.CancelledError:
            logger.info("Redis Pub/Sub subscriber task cancelled.")
            break
        except Exception as e:
            logger.error(
                "Redis Pub/Sub subscriber error: %s. Retrying in 5 seconds...",
                str(e),
            )
            await asyncio.sleep(5)
