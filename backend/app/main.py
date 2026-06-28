from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.init_db import init_db
from app.api import auth, webhook, signals, trades, strategies, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs database initialization on startup
    try:
        init_db()
    except Exception as e:
        print(f"Error during DB initialization: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Register API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(webhook.router, prefix=f"{settings.API_V1_STR}", tags=["webhook"])
app.include_router(signals.router, prefix=f"{settings.API_V1_STR}/signals", tags=["signals"])
app.include_router(trades.router, prefix=f"{settings.API_V1_STR}/trades", tags=["trades"])
app.include_router(strategies.router, prefix=f"{settings.API_V1_STR}/strategies", tags=["strategies"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])


@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }
