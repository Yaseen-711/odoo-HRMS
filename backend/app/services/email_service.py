"""Email service for constructing and dispatching SMTP notifications."""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)

# Gmail and most providers use port 465 for implicit TLS (SMTP_SSL).
# Port 587 uses explicit TLS via STARTTLS.
# Using SMTP (plain) on port 465 will time out — that is the observed failure.
_SSL_PORT = 465


def send_employee_credentials(
    to_email: str,
    first_name: str,
    login_id: str,
    temporary_password: str,
) -> bool:
    """
    Construct and send onboarding email containing login credentials over SMTP.
    Credentials and passwords are NEVER logged.

    Port selection:
    - 465  → smtplib.SMTP_SSL  (implicit TLS; required by Gmail on that port)
    - 587  → smtplib.SMTP + STARTTLS
    - other → smtplib.SMTP (plain, or with STARTTLS if SMTP_USE_TLS=true)
    """
    msg = EmailMessage()
    msg["Subject"] = "Welcome to Dayflow HRMS - Your Login Credentials"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email

    content = (
        f"Hello {first_name},\n\n"
        f"Welcome to Dayflow HRMS! Your account has been successfully created.\n\n"
        f"Your Login Credentials:\n"
        f"Login ID: {login_id}\n"
        f"Temporary Password: {temporary_password}\n\n"
        f"Please log in at your earliest convenience and change your temporary password.\n\n"
        f"Best regards,\n"
        f"Dayflow HR Team"
    )
    msg.set_content(content)

    try:
        if settings.SMTP_PORT == _SSL_PORT:
            # Implicit TLS — must use SMTP_SSL on port 465
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
        elif settings.SMTP_USE_TLS:
            # Explicit TLS via STARTTLS (port 587 typical)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            # Plain SMTP (local dev, port 25, etc.)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)

        logger.info("Successfully sent credential email to recipient=%s", to_email)
        return True
    except Exception as e:
        logger.error(
            "Failed to send credential email to recipient=%s error=%s",
            to_email,
            str(e),
        )
        return False
