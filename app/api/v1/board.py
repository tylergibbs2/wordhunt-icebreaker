from datetime import date

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import config
from app.dependency import BoardServiceDep, DailySeedDep, GameDateDep
from app.dto.board import BoardGenerationRequest, UnresolvedBoard

router = APIRouter()


class DailyBoardResponse(BaseModel):
    board: UnresolvedBoard
    seed: int
    day: date
    timer_duration: int


@router.get("/board")
async def get_board(
    board_service: BoardServiceDep, daily_seed: DailySeedDep, game_date: GameDateDep
) -> DailyBoardResponse:
    # Get date-specific board size and timer duration
    board_size = config.get_board_size_for_date(game_date)
    timer_duration = config.get_timer_duration_for_date(game_date)

    request = BoardGenerationRequest(board_size=board_size, target_richness=config.board_target_richness)

    generated = await board_service.generate_board(request, seed=daily_seed)
    return DailyBoardResponse(
        board=generated.to_unresolved(), seed=daily_seed, day=game_date, timer_duration=timer_duration
    )


@router.get("/dictionary-version")
async def get_dictionary_version(board_service: BoardServiceDep) -> int:
    return board_service.dictionary_version


@router.get("/dictionary")
async def get_dictionary(board_service: BoardServiceDep) -> list[str]:
    return list(board_service.dictionary)
