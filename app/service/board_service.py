from collections import OrderedDict
from pathlib import Path
import random
from typing import ClassVar

import aiofiles

from app.config import config
from app.dto.board import (
    BoardGenerationRequest,
    BoardGenerationResponse,
    MoveValidationRequest,
    MoveValidationResponse,
)


class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.is_word: bool = False


class BoardService:
    """Service class for generating and validating word hunt boards."""

    # Class variables for caching shared data
    _dictionary_version: ClassVar[int | None] = None
    _dictionary: ClassVar[set[str]] = set()
    _trie_root: ClassVar[TrieNode | None] = None
    _is_loaded: ClassVar[bool] = False

    wordlist_path: Path

    # Unified cache: dict[seed, BoardGenerationResponse | list[BoardGenerationResponse]]
    _cache: ClassVar[OrderedDict[int, BoardGenerationResponse | list[BoardGenerationResponse]]] = OrderedDict()
    _max_cache_size: ClassVar[int] = 30

    letter_frequencies: dict[str, float]
    letters: list[str]
    weights: list[float]

    def __init__(self, wordlist_path: Path | None = None, seed: int | None = None) -> None:
        """Initialize the BoardService with dictionary and trie."""
        self.wordlist_path = wordlist_path or config.wordlist_path

        letter_frequencies = {
            "E": 12.0,
            "A": 8.2,
            "R": 6.0,
            "I": 7.0,
            "O": 7.5,
            "T": 9.1,
            "N": 6.7,
            "S": 6.3,
            "L": 4.0,
            "C": 2.8,
            "U": 2.8,
            "D": 4.3,
            "P": 2.0,
            "M": 2.4,
            "H": 6.1,
            "G": 2.0,
            "B": 1.5,
            "F": 2.2,
            "Y": 2.0,
            "W": 2.0,
            "K": 0.8,
            "V": 1.0,
            "X": 0.2,
            "Z": 0.1,
            "J": 0.2,
            "Q": 0.1,
        }
        letters_weights = list(zip(*letter_frequencies.items(), strict=False))
        self.letters = list(letters_weights[0])
        self.weights = list(letters_weights[1])

    async def _load_dictionary(self) -> None:
        """Load the word dictionary and build the trie asynchronously."""
        if not self.wordlist_path.exists():
            raise FileNotFoundError(f"Wordlist not found at {self.wordlist_path}")

        async with aiofiles.open(self.wordlist_path) as f:
            content = await f.read()
            # get the version
            version = content.splitlines()[0].split(":")[1].strip()
            BoardService._dictionary_version = int(version)
            BoardService._dictionary = {
                line.strip().upper() for line in content.splitlines()[1:] if line.strip() and len(line.strip()) >= 3
            }

        BoardService._trie_root = self._build_trie(BoardService._dictionary)
        BoardService._is_loaded = True

    @classmethod
    async def ensure_loaded(cls, wordlist_path: Path | None = None, seed: int | None = None) -> None:
        """Ensure the dictionary is loaded (class method for async initialization)."""
        if not cls._is_loaded:
            service = cls(wordlist_path, seed)
            await service._load_dictionary()

    @property
    def dictionary(self) -> set[str]:
        return BoardService._dictionary

    @property
    def dictionary_version(self) -> int:
        if BoardService._dictionary_version is None:
            raise RuntimeError("Dictionary not loaded. Call ensure_loaded() first.")

        return BoardService._dictionary_version

    def _build_trie(self, words: set[str]) -> TrieNode:
        """Build a trie data structure from a set of words."""
        root = TrieNode()
        for word in words:
            node = root
            for ch in word:
                if ch not in node.children:
                    node.children[ch] = TrieNode()
                node = node.children[ch]
            node.is_word = True
        return root

    def _is_prefix(self, prefix: str) -> bool:
        """Check if a string is a valid prefix in the dictionary."""
        if not BoardService._trie_root:
            return False

        node = BoardService._trie_root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True

    def _is_word(self, word: str) -> bool:
        """Check if a string is a complete word in the dictionary."""
        if not BoardService._trie_root:
            return False

        node = BoardService._trie_root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.is_word

    def _generate_random_letter(self, rng: random.Random) -> str:
        """Generate a random letter based on frequency weights."""
        return rng.choices(self.letters, weights=self.weights, k=1)[0]

    def _generate_board(self, n: int, rng: random.Random) -> list[list[str]]:
        """Generate a random board of size n x n."""
        return [[self._generate_random_letter(rng) for _ in range(n)] for _ in range(n)]

    def _get_neighbors(self, n: int, x: int, y: int) -> list[tuple[int, int]]:
        """Get all valid neighboring positions for a given coordinate."""
        dirs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        return [(x + dx, y + dy) for dx, dy in dirs if 0 <= x + dx < n and 0 <= y + dy < n]

    def _dfs_find_words(
        self,
        grid: list[list[str]],
        x: int,
        y: int,
        visited: set[tuple[int, int]],
        prefix: str,
        results: set[str],
        min_length: int,
    ) -> None:
        """Depth-first search to find words on the board."""
        n = len(grid)
        word = prefix + grid[x][y]

        if not self._is_prefix(word):
            return

        if len(word) >= min_length and self._is_word(word):
            results.add(word)

        for nx, ny in self._get_neighbors(n, x, y):
            if (nx, ny) not in visited:
                self._dfs_find_words(grid, nx, ny, visited | {(nx, ny)}, word, results, min_length)

    def find_words(self, grid: list[list[str]], min_length: int = 3) -> set[str]:
        """Find all words on the board with minimum length."""
        results: set[str] = set()
        n = len(grid)

        for i in range(n):
            for j in range(n):
                self._dfs_find_words(grid, i, j, {(i, j)}, "", results, min_length)

        return results

    def _seed_word_path(self, grid: list[list[str]], word: str, rng: random.Random, max_retries: int = 50) -> bool:
        """Try to seed a word path on the board."""
        n = len(grid)
        w = word.upper()

        for _ in range(max_retries):
            used = set()
            path = []
            r, c = rng.randrange(n), rng.randrange(n)
            used.add((r, c))
            path.append((r, c))

            success = True
            for _ in w[1:]:
                options = [(rr, cc) for rr, cc in self._get_neighbors(n, r, c) if (rr, cc) not in used]
                if not options:
                    success = False
                    break
                r, c = rng.choice(options)
                used.add((r, c))
                path.append((r, c))

            if success and len(path) == len(w):
                for (rr, cc), ch in zip(path, w, strict=False):
                    grid[rr][cc] = ch
                return True

        return False

    def _compute_richness(self, words: list[str], board_size: int) -> float:
        """Compute the richness score for a board."""
        if not words:
            return 0.0

        # Calculate expected words based on board size
        # Larger boards have exponentially more possible word paths
        # Rough formula: expected_words = board_size^2 * 0.5
        max_expected_words = int(board_size * board_size * 0.5)

        # Scale word count based on board size
        count_score = min(len(words) / max_expected_words, 1.0)

        # Scale average word length based on board size
        # Larger boards can accommodate longer words
        max_expected_length = min(board_size * 2, 15)  # Cap at 15 for very large boards
        avg_length = sum(len(w) for w in words) / len(words) if words else 0
        length_score = min(avg_length / max_expected_length, 1.0)

        # Weight count more heavily than length
        return count_score * 0.8 + length_score * 0.2

    async def _do_generate_board(self, request: BoardGenerationRequest, rng: random.Random) -> BoardGenerationResponse:
        await self.ensure_loaded()

        candidate_long_words = sorted([w for w in BoardService._dictionary if len(w) >= request.min_word_length])
        max_attempts = 200
        tolerance = 0.05  # Accept boards within 5% of target

        best_board = None
        best_score_diff = float("inf")

        # Initialize fallback variables
        grid = self._generate_board(request.board_size, rng)
        words = sorted(self.find_words(grid, request.min_word_length))
        richness_score = self._compute_richness(words, request.board_size)

        for _ in range(max_attempts):
            grid = self._generate_board(request.board_size, rng)

            # Only seed words for higher target richness
            if request.target_richness > 0.5 and candidate_long_words:
                self._seed_word_path(grid, rng.choice(candidate_long_words), rng)

            words = sorted(self.find_words(grid, request.min_word_length))
            richness_score = self._compute_richness(words, request.board_size)

            # Check if this board meets minimum word count requirement
            if len(words) < request.min_word_count:
                continue

            # Check if this board is close enough to target
            score_diff = abs(richness_score - request.target_richness)
            if score_diff <= tolerance:
                return BoardGenerationResponse(grid=grid, richness=richness_score, words=words)

            # Keep track of the best attempt so far (only if it meets min word count)
            if score_diff < best_score_diff:
                best_score_diff = score_diff
                best_board = BoardGenerationResponse(grid=grid, richness=richness_score, words=words)

        # Return best attempt if no board meets tolerance
        if best_board:
            return best_board

        # If no board met min word count, return the last generated board
        return BoardGenerationResponse(grid=grid, richness=richness_score, words=words)

    async def generate_multiple_boards(
        self, request: BoardGenerationRequest, *, base_seed: int | None = None, num_boards: int = 10
    ) -> list[BoardGenerationResponse]:
        """Generate multiple boards with deterministic seeds based on base seed."""
        if base_seed is None:
            # Generate boards without caching if no seed provided
            boards = []
            for _ in range(num_boards):
                board = await self.generate_board(request, seed=None)
                boards.append(board)
            return boards

        # Check cache for multiple boards
        cached_item = self._get_from_cache(base_seed)
        if cached_item is not None and isinstance(cached_item, list):
            return cached_item

        boards = []
        for i in range(num_boards):
            # Create a unique seed for each board by combining base seed with board index
            board_seed = base_seed + i
            board = await self.generate_board(request, seed=board_seed)
            boards.append(board)

        # Cache the boards
        self._put_in_cache(base_seed, boards)
        return boards

    async def generate_board(
        self, request: BoardGenerationRequest, *, seed: int | None = None
    ) -> BoardGenerationResponse:
        """Generate a board with specified parameters."""
        if seed is None:
            # Generate board without caching if no seed provided
            return await self._do_generate_board(request, random.Random())

        # Check cache for single board
        cached_item = self._get_from_cache(seed)
        if cached_item is not None and isinstance(cached_item, BoardGenerationResponse):
            return cached_item

        board = await self._do_generate_board(request, random.Random(seed))
        self._put_in_cache(seed, board)
        return board

    def validate_move(self, request: MoveValidationRequest) -> MoveValidationResponse:
        """Validate a move on a board and calculate its score."""
        if not BoardService._is_loaded:
            raise RuntimeError("Dictionary not loaded. Call ensure_loaded() first.")

        # Build the word from coordinates
        word = "".join(request.board.grid[row][col] for row, col in request.move_coordinates).upper()
        if len(word) < request.min_word_length:
            return MoveValidationResponse(
                is_valid=False,
                word=word,
            )

        # Check if word is valid (at least a prefix)
        is_word = self._is_word(word)

        return MoveValidationResponse(
            is_valid=is_word,
            word=word,
        )

    @classmethod
    def clear_cache(cls) -> None:
        """Clear the cache."""
        cls._cache.clear()

    @classmethod
    def _manage_cache_size(cls) -> None:
        """Remove oldest entries if cache exceeds max size."""
        while len(cls._cache) > cls._max_cache_size:
            cls._cache.popitem(last=False)

    @classmethod
    def _get_from_cache(cls, seed: int) -> BoardGenerationResponse | list[BoardGenerationResponse] | None:
        """Get cached item and move to end (most recently used)."""
        if seed in cls._cache:
            item = cls._cache.pop(seed)
            cls._cache[seed] = item
            return item
        return None

    @classmethod
    def _put_in_cache(cls, seed: int, item: BoardGenerationResponse | list[BoardGenerationResponse]) -> None:
        """Put item in cache and manage cache size."""
        cls._cache[seed] = item
        cls._manage_cache_size()
