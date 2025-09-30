from pydantic import BaseModel, Field


class CreateGameRequest(BaseModel):
    board_size: int = Field(..., ge=3, le=10, description="Size of the board (3-10)")


class CreateGameResponse(BaseModel):
    game_id: str = Field(..., description="ID of the created game")
