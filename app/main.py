from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.api import api_router
from app.config import config


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:  # noqa
    logger.info("Starting up...")
    yield
    logger.info("Shutting down...")


def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify actual origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "environment": config.environment}

    # Include API router
    app.include_router(api_router)

    # Serve static files from frontend directory
    if config.should_serve_frontend():
        app.mount("/", StaticFiles(directory="app/static", html=True), name="static")

    return app


app = create_app()
