"""Dayflow HRMS — FastAPI application entrypoint."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.middleware.request_id import RequestIDMiddleware

# ── Logging must be configured before any other imports that use loggers ──
setup_logging()
logger = logging.getLogger(__name__)

# ── Routers ────────────────────────────────────────────────────────────────
from app.api.auth import router as auth_router
from app.api.employees import router as employees_router
from app.api.attendance import router as attendance_router
from app.api.leave import router as leave_router
from app.api.payroll import router as payroll_router
from app.api.dashboard import router as dashboard_router
from app.api.documents import router as documents_router

# ── Application ────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Human Resource Management System — Dayflow HRMS MVP",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ─────────────────────────────────────────────────────────────
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler — never leak internal details to clients ───────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "Unhandled exception  method=%s  path=%s  request_id=%s",
        request.method,
        request.url.path,
        getattr(request.state, "request_id", "N/A"),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please contact support."},
    )


# ── Routers ────────────────────────────────────────────────────────────────
prefix = settings.API_PREFIX

app.include_router(auth_router, prefix=prefix)
app.include_router(employees_router, prefix=prefix)
app.include_router(attendance_router, prefix=prefix)
app.include_router(leave_router, prefix=prefix)
app.include_router(payroll_router, prefix=prefix)
app.include_router(dashboard_router, prefix=prefix)
app.include_router(documents_router, prefix=prefix)


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "version": settings.VERSION}


logger.info("Dayflow HRMS started  version=%s", settings.VERSION)
