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

    def should_serve_frontend(self) -> bool:
        return self.environment == "production"

    def get_board_size_for_date(self, game_date: date) -> int:
        """Get board size for a specific date"""
        return self.board_size

    def get_timer_duration_for_date(self, game_date: date) -> int:
        """Get timer duration for a specific date"""
        return self.game_timer_duration


config = Config()
