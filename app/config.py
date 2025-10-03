from datetime import date, timedelta
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    environment: Literal["local", "production"] = "local"

    wordlist_path: Path = Path("WORDLIST.txt")
    daily_seed_salt: str = "local-salt"

    board_size: int = 4
    board_target_richness: float = 0.9
    game_day_offset: timedelta = timedelta(days=0)

    # Game timer configuration (in seconds)
    game_timer_duration: int = 90

    # Friday special settings
    friday_board_size: int = 4
    friday_timer_duration: int = 90  # 90 seconds

    def should_serve_frontend(self) -> bool:
        return self.environment == "production"

    def get_board_size_for_date(self, game_date: date) -> int:
        """Get board size for a specific date (5x5 on Fridays, 4x4 otherwise)"""
        if game_date.weekday() == 4:  # Friday is weekday 4
            return self.friday_board_size
        return self.board_size

    def get_timer_duration_for_date(self, game_date: date) -> int:
        """Get timer duration for a specific date (2 minutes on Fridays, 90 seconds otherwise)"""
        if game_date.weekday() == 4:  # Friday is weekday 4
            return self.friday_timer_duration
        return self.game_timer_duration


config = Config()
