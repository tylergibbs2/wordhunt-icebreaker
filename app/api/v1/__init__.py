from fastapi import APIRouter

from .board import router as board_router

v1_router = APIRouter(prefix="/v1")
v1_router.include_router(board_router)
