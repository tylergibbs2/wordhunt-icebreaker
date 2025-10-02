from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.config import config
from app.dependency import BoardServiceDep, DailySeedDep, GameDateDep
from app.dto.board import BoardGenerationRequest, UnresolvedBoard

router = APIRouter()


class MultiBoardResponse(BaseModel):
    boards: list[UnresolvedBoard] = Field(..., description="List of 10 boards for the day")
    seed: int = Field(..., description="Base seed for the day")
    day: date = Field(..., description="Game date")
    timer_duration: int = Field(..., description="Timer duration in seconds")


@router.get("/board")
async def get_board(
    board_service: BoardServiceDep, daily_seed: DailySeedDep, game_date: GameDateDep
) -> MultiBoardResponse:
    # Get date-specific board size and timer duration
    board_size = config.get_board_size_for_date(game_date)
    timer_duration = config.get_timer_duration_for_date(game_date)

    request = BoardGenerationRequest(board_size=board_size, target_richness=config.board_target_richness)

    generated_boards = await board_service.generate_multiple_boards(request, base_seed=daily_seed, num_boards=10)
    unresolved_boards = [board.to_unresolved() for board in generated_boards]

    return MultiBoardResponse(boards=unresolved_boards, seed=daily_seed, day=game_date, timer_duration=timer_duration)


@router.get("/dictionary-version")
async def get_dictionary_version(board_service: BoardServiceDep) -> int:
    return board_service.dictionary_version


@router.get("/dictionary")
async def get_dictionary(board_service: BoardServiceDep) -> list[str]:
    return list(board_service.dictionary)
