from datetime import date
import hashlib

from app.config import config


def calculate_daily_seed(game_date: date) -> int:
    """
    Calculate a cryptographically secure seed value based on the current date.

    The "day" changes at 8pm daily instead of midnight, providing a more
    convenient daily reset time for gameplay.

    Uses a combination of:
    - Current date adjusted for 8pm daily reset (YYYY-MM-DD format)
    - A secret salt from configuration
    - SHA-256 hashing for cryptographic security

    Returns a deterministic but secure integer seed that changes daily at 8pm.
    """
    current_date = game_date.isoformat()
    combined_input = f"{current_date}|{config.daily_seed_salt}"

    hash_object = hashlib.sha256(combined_input.encode("utf-8"))
    hash_hex = hash_object.hexdigest()

    # convert first 8 characters of hash to integer (32-bit)
    # this provides sufficient entropy while keeping the number manageable
    return int(hash_hex[:8], 16)
