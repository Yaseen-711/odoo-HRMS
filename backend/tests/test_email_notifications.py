"""Tests for email notification service, ARQ background job, and SMTP resilience."""

import logging
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from httpx import AsyncClient

from app.services.email_service import send_employee_credentials
from app.workers.jobs import send_employee_credentials_job


@pytest.mark.asyncio
async def test_employee_creation_enqueues_email(client: AsyncClient, admin_token: str):
    """Employee creation enqueues ARQ credential email job AFTER DB commit."""
    import uuid
    unique = uuid.uuid4().hex[:6]

    with patch(
        "app.services.employee_service.enqueue_send_credentials_job",
        new_callable=AsyncMock,
    ) as mock_enqueue:
        resp = await client.post(
            "/api/employees",
            json={
                "first_name": "EmailTest",
                "last_name": "User",
                "email": f"emailtest-{unique}@test.com",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()

        # Verify enqueue was called with credentials
        mock_enqueue.assert_called_once()
        call_kwargs = mock_enqueue.call_args.kwargs
        assert call_kwargs["to_email"] == f"emailtest-{unique}@test.com"
        assert call_kwargs["first_name"] == "EmailTest"
        assert call_kwargs["login_id"] == data["login_id"]
        assert call_kwargs["temporary_password"] == data["temporary_password"]


@pytest.mark.asyncio
async def test_email_job_does_not_execute_smtp_during_http_request(
    client: AsyncClient, admin_token: str
):
    """Verify SMTP send is not executed synchronously during HTTP request."""
    import uuid
    unique = uuid.uuid4().hex[:6]

    with patch("smtplib.SMTP") as mock_smtp:
        resp = await client.post(
            "/api/employees",
            json={
                "first_name": "AsyncSMTP",
                "last_name": "User",
                "email": f"asyncsmtp-{unique}@test.com",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        # smtplib.SMTP should NOT have been called directly in the HTTP request handler
        mock_smtp.assert_not_called()


@pytest.mark.asyncio
async def test_email_content_contains_credentials_in_payload():
    """Verify email content formatting and credentials presence in message payload.

    Port 465 requires smtplib.SMTP_SSL (implicit TLS).
    The test mocks SMTP_SSL since the .env configures port 465 (Gmail).
    """
    with patch("smtplib.SMTP_SSL") as mock_smtp_cls:
        mock_smtp_inst = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_smtp_inst

        success = send_employee_credentials(
            to_email="user@test.com",
            first_name="John",
            login_id="OIJODO20260001",
            temporary_password="TempPassword123!",
        )
        assert success is True
        mock_smtp_inst.send_message.assert_called_once()
        msg = mock_smtp_inst.send_message.call_args[0][0]
        payload = msg.get_content()

        assert "John" in payload
        assert "OIJODO20260001" in payload
        assert "TempPassword123!" in payload


@pytest.mark.asyncio
async def test_port_465_uses_smtp_ssl_not_starttls():
    """Port 465 must use smtplib.SMTP_SSL (implicit TLS), NOT smtplib.SMTP + starttls.

    Using plain smtplib.SMTP on port 465 causes a connection timeout because
    Gmail expects an SSL handshake immediately on that port.
    """
    with patch("smtplib.SMTP_SSL") as mock_ssl, patch("smtplib.SMTP") as mock_plain:
        mock_ssl.return_value.__enter__.return_value = MagicMock()

        send_employee_credentials(
            to_email="sslcheck@test.com",
            first_name="SSL",
            login_id="OISSLC20260001",
            temporary_password="DoNotLog!",
        )

        # SMTP_SSL must have been instantiated for port 465
        mock_ssl.assert_called_once()
        # Plain smtplib.SMTP must NOT have been used on port 465
        mock_plain.assert_not_called()


@pytest.mark.asyncio
async def test_smtp_failure_does_not_rollback_employee_creation(
    client: AsyncClient, admin_token: str
):
    """Verify that if ARQ enqueue or SMTP fails, committed employee creation persists."""
    import uuid
    unique = uuid.uuid4().hex[:6]

    # Force enqueue_send_credentials_job to fail
    with patch(
        "app.services.employee_service.enqueue_send_credentials_job",
        side_effect=Exception("Redis/ARQ queue unreachable"),
    ):
        resp = await client.post(
            "/api/employees",
            json={
                "first_name": "FailSafe",
                "last_name": "Employee",
                "email": f"failsafe-{unique}@test.com",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # Employee creation must succeed despite enqueue failure
        assert resp.status_code == 201
        assert "login_id" in resp.json()


@pytest.mark.asyncio
async def test_smtp_credentials_never_logged(caplog):
    """Verify sensitive password strings are not printed to logs."""
    caplog.set_level(logging.INFO)
    secret_pass = "SuperSecretPassword999!"

    with patch("smtplib.SMTP_SSL") as mock_smtp_cls:
        mock_smtp_inst = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_smtp_inst

        send_employee_credentials(
            to_email="logcheck@test.com",
            first_name="LogCheck",
            login_id="OILOGC20260001",
            temporary_password=secret_pass,
        )

    for record in caplog.records:
        assert secret_pass not in record.getMessage()
