from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import Depends

from app.config import config
from app.service import BoardService
from app.utils import calculate_daily_seed


async def get_board_service() -> BoardService:
    service = BoardService()
    await service.ensure_loaded()
    return service


BoardServiceDep = Annotated[BoardService, Depends(get_board_service)]


def get_game_date() -> date:
    # Use UTC time to avoid timezone issues
    now = datetime.now()

    # calculate the "game day" - if it's before 8pm, use today's date
    # if it's 8pm or later, use tomorrow's date
    if now.hour < 20:  # before 8pm
        game_date = now.date()
    else:  # 8pm or later
        game_date = now.date() + timedelta(days=1)

    return game_date + config.game_day_offset


GameDateDep = Annotated[date, Depends(get_game_date)]


def get_daily_seed(game_date: GameDateDep) -> int:
    return calculate_daily_seed(game_date)


DailySeedDep = Annotated[int, Depends(get_daily_seed)]
