"""Legacy auth.py — re-exports from auth_service for backward compatibility."""

from app.services.auth_service import authenticate_user, change_password  # noqa: F401
