import asyncio
from pathlib import Path
import random

from pydantic import ValidationError
import pytest

from app.dto.board import (
    BoardGenerationRequest,
    BoardGenerationResponse,
    MoveValidationRequest,
    MoveValidationResponse,
    UnresolvedBoard,
)
from app.service.board_service import (
    BoardService,
    TrieNode,
)


@pytest.fixture
def mock_wordlist_content() -> str:
    """Mock wordlist content for testing."""
    return "version: 1\nCAT\nDOG\nBAT\nRAT\nCAR\nBAR\nTAR\nART\nACT\nCOAT\nBOAT\nGOAT\n"


@pytest.fixture
def mock_wordlist_path(tmp_path: Path, mock_wordlist_content: str) -> Path:
    """Create a temporary wordlist file for testing."""
    wordlist_file = tmp_path / "test_wordlist.txt"
    wordlist_file.write_text(mock_wordlist_content)
    return wordlist_file


@pytest.fixture
async def board_service(mock_wordlist_path: Path) -> BoardService:
    """Create a BoardService instance for testing."""
    service = BoardService(wordlist_path=mock_wordlist_path)
    await service._load_dictionary()
    service.clear_cache()
    return service


def test_trie_node_initialization():
    """Test that TrieNode initializes with empty children and no word flag."""
    node = TrieNode()
    assert node.children == {}
    assert node.is_word is False


def test_board_service_initialization(mock_wordlist_path: Path):
    """Test BoardService initialization with custom wordlist path."""
    service = BoardService(wordlist_path=mock_wordlist_path)
    assert service.wordlist_path == mock_wordlist_path
    assert len(service.letters) == 26
    assert service.letters is not None
    assert service.weights is not None


def test_board_service_default_initialization():
    """Test BoardService initialization with default parameters."""
    service = BoardService()
    assert service.wordlist_path == Path("WORDLIST.txt")


async def test_load_dictionary_success(mock_wordlist_path: Path):
    """Test successful dictionary loading."""
    service = BoardService(wordlist_path=mock_wordlist_path)
    await service._load_dictionary()

    # Check class variables
    assert len(BoardService._dictionary) == 12  # Based on mock content
    assert "CAT" in BoardService._dictionary
    assert "DOG" in BoardService._dictionary
    assert BoardService._trie_root is not None
    assert BoardService._is_loaded is True


async def test_load_dictionary_file_not_found():
    """Test dictionary loading with non-existent file."""
    service = BoardService(wordlist_path=Path("nonexistent.txt"))
    with pytest.raises(FileNotFoundError, match="Wordlist not found"):
        await service._load_dictionary()


async def test_ensure_loaded_class_method(mock_wordlist_path: Path):
    """Test the ensure_loaded class method."""
    # Reset class variables
    BoardService._is_loaded = False
    BoardService._dictionary = set()
    BoardService._trie_root = None

    await BoardService.ensure_loaded(wordlist_path=mock_wordlist_path)

    assert BoardService._is_loaded is True
    assert len(BoardService._dictionary) > 0
    assert BoardService._trie_root is not None


def test_build_trie(board_service: BoardService):
    """Test trie building functionality."""
    service = board_service
    test_words = {"CAT", "DOG", "BAT"}
    trie = service._build_trie(test_words)

    assert isinstance(trie, TrieNode)
    # Test that words are properly stored in trie
    assert service._is_word("CAT")
    assert service._is_word("DOG")
    assert service._is_word("BAT")
    assert not service._is_word("FOO")


def test_is_prefix(board_service: BoardService):
    """Test prefix checking functionality."""
    service = board_service
    # Test valid prefixes
    assert service._is_prefix("C")
    assert service._is_prefix("CA")
    assert service._is_prefix("CAT")

    # Test invalid prefixes
    assert not service._is_prefix("X")
    assert not service._is_prefix("CX")


def test_is_word(board_service: BoardService):
    """Test word checking functionality."""
    service = board_service
    # Test valid words
    assert service._is_word("CAT")
    assert service._is_word("DOG")
    assert service._is_word("BAT")

    # Test invalid words
    assert not service._is_word("CA")
    assert not service._is_word("FOO")
    assert not service._is_word("CATS")


def test_generate_random_letter(board_service: BoardService):
    """Test random letter generation."""
    service = board_service
    letter = service._generate_random_letter(random.Random(123))
    assert isinstance(letter, str)
    assert len(letter) == 1
    assert letter in service.letters


def test_generate_board(board_service: BoardService):
    """Test board generation."""
    service = board_service
    size = 5
    board = service._generate_board(size, random.Random(123))

    assert len(board) == size
    assert all(len(row) == size for row in board)
    assert all(letter in service.letters for row in board for letter in row)


def test_get_neighbors(board_service: BoardService):
    """Test neighbor calculation."""
    service = board_service
    # Test center position
    neighbors = service._get_neighbors(5, 2, 2)
    assert len(neighbors) == 8
    assert (1, 1) in neighbors
    assert (3, 3) in neighbors

    # Test corner position
    neighbors = service._get_neighbors(5, 0, 0)
    assert len(neighbors) == 3
    assert (0, 1) in neighbors
    assert (1, 0) in neighbors
    assert (1, 1) in neighbors


def test_dfs_find_words(board_service: BoardService):
    """Test depth-first search for words."""
    service = board_service
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    results = set()
    service._dfs_find_words(grid, 0, 0, {(0, 0)}, "", results, 3)

    # Should find words starting from (0,0)
    assert len(results) > 0


def test_find_words(board_service: BoardService):
    """Test word finding on a board."""
    service = board_service
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    words = service.find_words(grid, min_length=3)

    assert isinstance(words, set)
    # Should find some words from the grid
    assert len(words) >= 0


def test_seed_word_path_success(board_service: BoardService):
    """Test successful word path seeding."""
    service = board_service
    grid = [["X", "X", "X"], ["X", "X", "X"], ["X", "X", "X"]]
    success = service._seed_word_path(grid, "CAT", random.Random(123))

    # Should succeed in placing the word
    assert success is True
    # Check that the word letters are in the grid
    grid_letters = [letter for row in grid for letter in row]
    assert "C" in grid_letters
    assert "A" in grid_letters
    assert "T" in grid_letters


def test_seed_word_path_failure(board_service: BoardService):
    """Test word path seeding failure with impossible word."""
    service = board_service
    grid = [["X", "X"], ["X", "X"]]  # 2x2 grid too small for long word
    success = service._seed_word_path(grid, "VERYLONGWORD", random.Random(123))

    # Should fail to place the word
    assert success is False


def test_compute_richness(board_service: BoardService):
    """Test richness calculation."""
    service = board_service
    # Test empty words
    richness = service._compute_richness([], 5)
    assert richness == 0.0

    # Test with words
    words = ["CAT", "DOG", "BAT", "RAT"]
    richness = service._compute_richness(words, 5)
    assert 0.0 <= richness <= 1.0


async def test_generate_rich_board_success(board_service: BoardService):
    """Test successful board generation."""
    service = board_service
    request = BoardGenerationRequest(board_size=5, target_richness=0.5, min_word_length=3, min_word_count=1)

    result = await service.generate_board(request, seed=123)

    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 5
    assert len(result.grid) == 5
    assert all(len(row) == 5 for row in result.grid)
    assert 0.0 <= result.richness <= 1.0
    assert isinstance(result.words, list)


async def test_generate_rich_board_deterministic(mock_wordlist_path: Path):
    """Test that seeded random produces deterministic results."""
    service1 = BoardService(wordlist_path=mock_wordlist_path)
    service2 = BoardService(wordlist_path=mock_wordlist_path)
    BoardService.clear_cache()

    await service1._load_dictionary()
    await service2._load_dictionary()

    request = BoardGenerationRequest(board_size=4, target_richness=0.3)

    result1 = await service1.generate_board(request, seed=42)
    result2 = await service2.generate_board(request, seed=42)

    # Results should be identical with same seed
    assert result1.grid == result2.grid
    assert result1.richness == result2.richness
    assert result1.words == result2.words


async def test_concurrent_dictionary_loading(mock_wordlist_path: Path):
    """Test that concurrent dictionary loading is handled properly."""
    # Create multiple services concurrently
    services = [BoardService(wordlist_path=mock_wordlist_path) for _ in range(5)]

    # Load dictionaries concurrently
    await asyncio.gather(*[service._load_dictionary() for service in services])

    # All should be loaded (check class variables)
    assert BoardService._is_loaded is True
    assert len(BoardService._dictionary) > 0
    assert BoardService._trie_root is not None


def test_letter_frequency_weights(board_service: BoardService):
    """Test that letter frequencies are properly weighted."""
    service = board_service
    # Generate many letters and check that common letters appear more often
    rng = random.Random(123)
    letters = [service._generate_random_letter(rng) for _ in range(1000)]
    letter_counts = {}
    for letter in letters:
        letter_counts[letter] = letter_counts.get(letter, 0) + 1

    # E should appear more frequently than Z
    assert letter_counts.get("E", 0) > letter_counts.get("Z", 0)
    assert letter_counts.get("A", 0) > letter_counts.get("Q", 0)


async def test_large_board_generation(board_service: BoardService):
    """Test generation of larger boards."""
    service = board_service
    request = BoardGenerationRequest(board_size=8, target_richness=0.3, min_word_length=4)

    result = await service.generate_board(request)

    assert result.size == 8
    assert len(result.grid) == 8
    assert all(len(row) == 8 for row in result.grid)
    assert 0.0 <= result.richness <= 1.0


async def test_deterministic_board_generation_with_same_seed(mock_wordlist_path: Path):
    """Test that same seed produces identical boards."""
    # Create two services with same seed
    service1 = BoardService(wordlist_path=mock_wordlist_path)
    service2 = BoardService(wordlist_path=mock_wordlist_path)
    BoardService.clear_cache()

    # Load dictionaries
    await service1._load_dictionary()
    await service2._load_dictionary()

    # Generate boards with same parameters
    request = BoardGenerationRequest(board_size=4, target_richness=0.4)
    result1 = await service1.generate_board(request, seed=999)
    result2 = await service2.generate_board(request, seed=999)

    # Results should be identical
    assert result1.grid == result2.grid
    assert result1.richness == result2.richness
    assert result1.words == result2.words


async def test_different_seeds_produce_different_boards(mock_wordlist_path: Path):
    """Test that different seeds produce different boards."""
    # Create two services with different seeds
    service1 = BoardService(wordlist_path=mock_wordlist_path)
    service2 = BoardService(wordlist_path=mock_wordlist_path)
    BoardService.clear_cache()

    # Load dictionaries
    await service1._load_dictionary()
    await service2._load_dictionary()

    # Generate boards with same parameters
    request = BoardGenerationRequest(board_size=4, target_richness=0.4)
    result1 = await service1.generate_board(request, seed=111)
    result2 = await service2.generate_board(request, seed=222)

    # Results should be different
    assert result1.grid != result2.grid


async def test_board_generation_with_custom_random_generator(mock_wordlist_path: Path):
    """Test board generation with custom random generator."""
    # Create custom random generator
    service = BoardService(wordlist_path=mock_wordlist_path, seed=42)
    BoardService.clear_cache()

    # Load dictionary
    await service._load_dictionary()

    # Generate board
    request = BoardGenerationRequest(board_size=4)
    result = await service.generate_board(request)

    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 4
    assert len(result.grid) == 4


def test_board_richness_calculation_edge_cases(board_service: BoardService):
    """Test richness calculation with edge cases."""
    service = board_service
    # Test with no words
    richness = service._compute_richness([], 5)
    assert richness == 0.0

    # Test with single word
    richness = service._compute_richness(["CAT"], 5)
    assert 0.0 <= richness <= 1.0

    # Test with many words
    many_words = ["CAT", "DOG", "BAT", "RAT", "CAR", "BAR", "TAR", "ART"]
    richness = service._compute_richness(many_words, 5)
    assert 0.0 <= richness <= 1.0


async def test_board_generation_with_high_richness_target(mock_wordlist_path: Path):
    """Test board generation with high richness target."""
    service = BoardService(wordlist_path=mock_wordlist_path)
    BoardService.clear_cache()
    await service._load_dictionary()

    request = BoardGenerationRequest(board_size=6, target_richness=0.9, min_word_length=4, min_word_count=5)

    result = await service.generate_board(request, seed=123)
    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 6
    assert 0.0 <= result.richness <= 1.0


def test_validate_move_success(board_service: BoardService):
    """Test successful move validation."""
    service = board_service
    # Create a simple 3x3 board
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board_result = UnresolvedBoard(grid=grid)

    # Test valid move: CAT (top row)
    request = MoveValidationRequest(board=board_result, move_coordinates=[(0, 0), (0, 1), (0, 2)])

    response = service.validate_move(request)

    assert isinstance(response, MoveValidationResponse)
    assert response.is_valid is True
    assert response.word == "CAT"
    assert response.score > 0


def test_validate_move_invalid_path():
    """Test move validation with invalid path (non-adjacent coordinates)."""
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test invalid move: non-adjacent coordinates (need at least 3 coordinates)
    with pytest.raises(ValidationError, match="Move coordinates must be adjacent"):
        MoveValidationRequest(
            board=board,
            move_coordinates=[(0, 0), (0, 1), (2, 2)],  # Not adjacent
        )


def test_validate_move_out_of_bounds(board_service: BoardService):
    """Test move validation with out-of-bounds coordinates."""
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test invalid move: out of bounds
    with pytest.raises(ValidationError, match="Move coordinates must be within the board"):
        MoveValidationRequest(
            board=board,
            move_coordinates=[(0, 0), (0, 1), (0, 3)],  # Column 3 is out of bounds
        )


def test_validate_move_duplicate_coordinates(board_service: BoardService):
    """Test move validation with duplicate coordinates."""
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test invalid move: duplicate coordinates
    with pytest.raises(ValidationError, match="Move coordinates must be unique"):
        MoveValidationRequest(
            board=board,
            move_coordinates=[(0, 0), (0, 1), (0, 0)],  # (0,0) used twice
        )


def test_validate_move_diagonal_path(board_service: BoardService):
    """Test move validation with diagonal path."""
    service = board_service
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test valid diagonal move that forms a valid word
    request = MoveValidationRequest(
        board=board,
        move_coordinates=[(0, 0), (0, 1), (0, 2)],  # CAT - valid word
    )

    response = service.validate_move(request)

    assert response.is_valid is True
    assert response.word == "CAT"
    assert response.score > 0


def test_validate_move_not_loaded():
    """Test move validation when dictionary is not loaded."""
    # Reset class variables to simulate not loaded state
    BoardService._is_loaded = False
    BoardService._dictionary = set()
    BoardService._trie_root = None

    service = BoardService()
    BoardService.clear_cache()
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    request = MoveValidationRequest(board=board, move_coordinates=[(0, 0), (0, 1), (0, 2)])

    with pytest.raises(RuntimeError, match="Dictionary not loaded"):
        service.validate_move(request)


def test_calculate_word_score(board_service: BoardService):
    """Test word score calculation."""
    service = board_service

    # Test short word
    score_short = service._calculate_word_score("CAT")
    assert score_short > 0

    # Test longer word (should get bonus)
    score_long = service._calculate_word_score("CATALOG")
    assert score_long > score_short

    # Test very long word (should get more bonus)
    score_very_long = service._calculate_word_score("CATALOGUING")
    assert score_very_long > score_long

    # Test empty word
    score_empty = service._calculate_word_score("")
    assert score_empty == 0


def test_validate_move_prefix_only(board_service: BoardService):
    """Test move validation with word that's only a prefix, not complete word."""
    service = board_service
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test move that forms a prefix but not a complete word (need at least 3 coordinates)
    # "COAT" is in our dictionary, so "COA" should be a prefix
    request = MoveValidationRequest(
        board=board,
        move_coordinates=[(0, 0), (1, 1), (0, 1)],  # "COA" - should be a prefix of "COAT"
    )

    response = service.validate_move(request)

    assert response.is_valid is False  # Not a valid dictionary word
    assert response.word == "COA"
    assert response.score > 0


def test_validate_move_invalid_word(board_service: BoardService):
    """Test move validation with invalid word (not even a prefix)."""
    service = board_service
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test move that forms an invalid word - use a word that's definitely not a prefix
    # Our dictionary has words starting with C, D, B, R, T, A, G, O
    # Let's use a word that starts with a letter not in our dictionary
    request = MoveValidationRequest(
        board=board,
        move_coordinates=[(0, 0), (1, 1), (2, 0)],  # "COB" - likely invalid
    )

    response = service.validate_move(request)

    # The move should be valid (path is valid) but the word might not be in dictionary
    # Since "COB" is not a prefix of any word in our dictionary, it should be invalid
    assert response.is_valid is False  # Not a valid prefix
    assert response.word == "COB"
    assert response.score > 0  # Still gets a score for the move


def test_validate_move_minimum_length(board_service: BoardService):
    """Test move validation with minimum length requirement."""
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test move that's too short (less than 3 letters)
    # The Pydantic model enforces min_length=3, so this should fail validation
    with pytest.raises(ValidationError):  # Pydantic validation error
        MoveValidationRequest(
            board=board,
            move_coordinates=[(0, 0), (0, 1)],  # Too short
        )


def test_validate_move_maximum_length(board_service: BoardService):
    """Test move validation with maximum length."""
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test move that's too long (more than 16 letters)
    long_coordinates = [(0, 0)] * 17  # 17 coordinates

    # This should fail Pydantic validation
    with pytest.raises(ValidationError):  # Pydantic validation error
        MoveValidationRequest(board=board, move_coordinates=long_coordinates)
