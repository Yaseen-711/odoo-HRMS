from fastapi import FastAPI
from app.core.config import settings
from app.api.auth import router as auth_router


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION
)

app.include_router(auth_router, prefix=settings.API_PREFIX)
