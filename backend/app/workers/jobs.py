"""ARQ background worker tasks and enqueue helpers for background processing."""

import logging
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.services.email_service import send_employee_credentials

logger = logging.getLogger(__name__)


async def send_employee_credentials_job(
    ctx: dict,
    to_email: str,
    first_name: str,
    login_id: str,
    temporary_password: str,
) -> bool:
    """
    ARQ task executing the background credential email dispatch.
    """
    logger.info("Executing ARQ job send_employee_credentials_job for email=%s", to_email)
    return send_employee_credentials(
        to_email=to_email,
        first_name=first_name,
        login_id=login_id,
        temporary_password=temporary_password,
    )


async def enqueue_send_credentials_job(
    to_email: str,
    first_name: str,
    login_id: str,
    temporary_password: str,
) -> None:
    """
    Helper function to enqueue credential email job onto Redis ARQ queue.
    Catches and logs any enqueue failure to ensure database transaction integrity.
    """
    try:
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        redis = await create_pool(redis_settings)
        await redis.enqueue_job(
            "send_employee_credentials_job",
            to_email,
            first_name,
            login_id,
            temporary_password,
        )
        await redis.aclose()
        logger.info("Successfully enqueued credential email job for email=%s", to_email)
    except Exception as e:
        logger.error(
            "Failed to enqueue credential email job for email=%s error=%s",
            to_email,
            str(e),
            exc_info=True,
        )


class WorkerSettings:
    """ARQ Worker configuration settings."""

    functions = [send_employee_credentials_job]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
