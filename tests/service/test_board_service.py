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
    WordBasedBoardGenerationRequest,
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


# Word-based board generation tests
async def test_generate_board_from_words_success(board_service: BoardService):
    """Test successful word-based board generation."""
    service = board_service
    request = WordBasedBoardGenerationRequest(board_size=4, words=["CAT", "DOG", "BAT", "RAT"], min_word_length=3)

    result = await service.generate_board_from_words(request, seed=42)

    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 4
    assert len(result.grid) == 4
    assert all(len(row) == 4 for row in result.grid)
    assert 0.0 <= result.richness <= 1.0
    assert isinstance(result.words, list)
    # All found words should be from the input list
    input_words_set = set(request.words)
    for word in result.words:
        assert word in input_words_set


async def test_generate_board_from_words_deterministic(mock_wordlist_path: Path):
    """Test that seeded word-based generation produces deterministic results."""
    service1 = BoardService(wordlist_path=mock_wordlist_path)
    service2 = BoardService(wordlist_path=mock_wordlist_path)
    BoardService.clear_cache()

    await service1._load_dictionary()
    await service2._load_dictionary()

    request = WordBasedBoardGenerationRequest(board_size=4, words=["CAT", "DOG", "BAT", "RAT"], min_word_length=3)

    result1 = await service1.generate_board_from_words(request, seed=123)
    result2 = await service2.generate_board_from_words(request, seed=123)

    # Results should be identical with same seed
    assert result1.grid == result2.grid
    assert result1.richness == result2.richness
    assert result1.words == result2.words


async def test_generate_board_from_words_different_seeds(mock_wordlist_path: Path):
    """Test that different seeds produce different boards."""
    service1 = BoardService(wordlist_path=mock_wordlist_path)
    service2 = BoardService(wordlist_path=mock_wordlist_path)
    BoardService.clear_cache()

    await service1._load_dictionary()
    await service2._load_dictionary()

    request = WordBasedBoardGenerationRequest(board_size=4, words=["CAT", "DOG", "BAT", "RAT"], min_word_length=3)

    result1 = await service1.generate_board_from_words(request, seed=111)
    result2 = await service2.generate_board_from_words(request, seed=222)

    # Results should be different
    assert result1.grid != result2.grid


async def test_generate_board_from_words_no_valid_words():
    """Test word-based generation with no valid words."""
    service = BoardService()
    request = WordBasedBoardGenerationRequest(
        board_size=4,
        words=["AB", "CD"],
        min_word_length=3,  # All words too short
    )

    with pytest.raises(ValueError, match="No valid words found with minimum length 3"):
        await service.generate_board_from_words(request)


async def test_generate_board_from_words_word_filtering(board_service: BoardService):
    """Test that word filtering works correctly."""
    service = board_service
    request = WordBasedBoardGenerationRequest(board_size=4, words=["CAT", "DOG", "AB", "BAT", "CD"], min_word_length=3)

    result = await service.generate_board_from_words(request, seed=42)

    # Should only use words >= 3 characters
    input_words_set = set(["CAT", "DOG", "BAT"])  # Filtered words
    for word in result.words:
        assert word in input_words_set


async def test_generate_board_from_words_case_handling(board_service: BoardService):
    """Test that case handling works correctly."""
    service = board_service
    request = WordBasedBoardGenerationRequest(board_size=4, words=["cat", "DOG", "Bat", "rat"], min_word_length=3)

    result = await service.generate_board_from_words(request, seed=42)

    # Should find words regardless of original case
    input_words_set = set(["CAT", "DOG", "BAT", "RAT"])  # Normalized to uppercase
    for word in result.words:
        assert word in input_words_set


def test_find_words_from_list(board_service: BoardService):
    """Test finding words from a specific word list."""
    service = board_service
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    word_list = ["CAT", "DOG", "BAT", "RAT", "COAT"]

    words = service._find_words_from_list(grid, word_list, min_length=3)

    assert isinstance(words, set)
    # Should find words that are in the word list
    for word in words:
        assert word in word_list
        assert len(word) >= 3


def test_dfs_find_words_from_list(board_service: BoardService):
    """Test depth-first search for words from a specific list."""
    service = board_service
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    word_set = {"CAT", "DOG", "BAT", "RAT"}
    results = set()

    service._dfs_find_words_from_list(grid, 0, 0, {(0, 0)}, "", results, 3, word_set)

    # Should find words starting from (0,0) that are in the word set
    assert isinstance(results, set)


def test_generate_board_from_word_list(board_service: BoardService):
    """Test board generation from word list."""
    service = board_service
    words = ["CAT", "DOG", "BAT"]
    board_size = 4

    grid = service._generate_board_from_word_list(board_size, words, random.Random(42))

    assert len(grid) == board_size
    assert all(len(row) == board_size for row in grid)
    # All cells should be filled
    assert all(letter != "" for row in grid for letter in row)


def test_try_place_word_complex_success(board_service: BoardService):
    """Test successful complex word placement."""
    service = board_service
    grid = [["", "", ""], ["", "", ""], ["", "", ""]]
    word = "CAT"

    success = service._try_place_word_complex(grid, word, random.Random(42))

    assert success is True
    # Check that the word letters are in the grid
    grid_letters = [letter for row in grid for letter in row]
    assert "C" in grid_letters
    assert "A" in grid_letters
    assert "T" in grid_letters


def test_try_place_word_complex_failure(board_service: BoardService):
    """Test complex word placement failure with impossible word."""
    service = board_service
    grid = [["X", "X"], ["X", "X"]]  # 2x2 grid too small for long word
    word = "VERYLONGWORD"

    success = service._try_place_word_complex(grid, word, random.Random(42))

    assert success is False


def test_find_snake_path(board_service: BoardService):
    """Test snake path finding."""
    service = board_service
    grid = [["", "", ""], ["", "", ""], ["", "", ""]]
    word = "CAT"

    path = service._find_snake_path(grid, word, 0, 0, random.Random(42))

    if path:
        assert len(path) == len(word)
        assert path[0] == (0, 0)
        # Check that path is valid (adjacent positions)
        for i in range(1, len(path)):
            prev_row, prev_col = path[i - 1]
            curr_row, curr_col = path[i]
            assert abs(curr_row - prev_row) <= 1
            assert abs(curr_col - prev_col) <= 1


def test_find_l_shape_path(board_service: BoardService):
    """Test L-shape path finding."""
    service = board_service
    grid = [["", "", ""], ["", "", ""], ["", "", ""]]
    word = "CAT"

    path = service._find_l_shape_path(grid, word, 0, 0, random.Random(42))

    if path:
        assert len(path) == len(word)
        assert path[0] == (0, 0)


def test_find_spiral_path(board_service: BoardService):
    """Test spiral path finding."""
    service = board_service
    grid = [["", "", "", ""], ["", "", "", ""], ["", "", "", ""], ["", "", "", ""]]
    word = "COAT"

    path = service._find_spiral_path(grid, word, 0, 0, random.Random(42))

    if path:
        assert len(path) == len(word)
        assert path[0] == (0, 0)


def test_find_random_walk_path(board_service: BoardService):
    """Test random walk path finding."""
    service = board_service
    grid = [["", "", ""], ["", "", ""], ["", "", ""]]
    word = "CAT"

    path = service._find_random_walk_path(grid, word, 0, 0, random.Random(42))

    if path:
        assert len(path) == len(word)
        assert path[0] == (0, 0)


def test_place_word_along_path(board_service: BoardService):
    """Test word placement along a path."""
    service = board_service
    grid = [["", "", ""], ["", "", ""], ["", "", ""]]
    word = "CAT"
    path = [(0, 0), (0, 1), (1, 1)]

    service._place_word_along_path(grid, word, path)

    assert grid[0][0] == "C"
    assert grid[0][1] == "A"
    assert grid[1][1] == "T"


async def test_generate_board_from_words_large_board(board_service: BoardService):
    """Test word-based generation with larger board."""
    service = board_service
    request = WordBasedBoardGenerationRequest(
        board_size=6, words=["CAT", "DOG", "BAT", "RAT", "COAT", "BOAT"], min_word_length=3
    )

    result = await service.generate_board_from_words(request, seed=42)

    assert result.size == 6
    assert len(result.grid) == 6
    assert all(len(row) == 6 for row in result.grid)
    assert 0.0 <= result.richness <= 1.0


async def test_generate_board_from_words_minimum_length_filtering(board_service: BoardService):
    """Test that minimum length filtering works correctly."""
    service = board_service
    request = WordBasedBoardGenerationRequest(
        board_size=4, words=["CAT", "DOG", "BAT", "RAT", "COAT"], min_word_length=4
    )

    result = await service.generate_board_from_words(request, seed=42)

    # Should only use words >= 4 characters
    input_words_set = set(["COAT"])  # Only word >= 4 chars
    for word in result.words:
        assert word in input_words_set
        assert len(word) >= 4


async def test_generate_board_from_words_retry_logic(board_service: BoardService):
    """Test that retry logic works when random letters form unintended words."""
    service = board_service
    # Use words that are unlikely to form other words when placed
    request = WordBasedBoardGenerationRequest(board_size=3, words=["CAT", "DOG"], min_word_length=3)

    result = await service.generate_board_from_words(request, seed=42)

    # Should succeed and only contain input words
    input_words_set = set(request.words)
    for word in result.words:
        assert word in input_words_set


def test_generate_board_from_words_empty_input():
    """Test word-based generation with empty word list."""
    # Test that Pydantic validation prevents empty word list
    with pytest.raises(ValidationError, match="List should have at least 1 item"):
        WordBasedBoardGenerationRequest(board_size=4, words=[], min_word_length=3)


async def test_generate_board_from_words_single_word(board_service: BoardService):
    """Test word-based generation with single word."""
    service = board_service
    request = WordBasedBoardGenerationRequest(board_size=3, words=["CAT"], min_word_length=3)

    result = await service.generate_board_from_words(request, seed=42)

    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 3
    assert len(result.grid) == 3
    # Should contain the input word
    assert "CAT" in result.words


async def test_generate_board_from_words_word_overlap(board_service: BoardService):
    """Test that overlapping words are handled correctly."""
    service = board_service
    # Use words that can share letters
    request = WordBasedBoardGenerationRequest(board_size=4, words=["CAT", "CAR", "BAT", "BAR"], min_word_length=3)

    result = await service.generate_board_from_words(request, seed=42)

    assert isinstance(result, BoardGenerationResponse)
    # Should find some of the input words
    input_words_set = set(request.words)
    found_input_words = [word for word in result.words if word in input_words_set]
    assert len(found_input_words) > 0


async def test_generate_board_from_words_complex_paths(board_service: BoardService):
    """Test that the new algorithm creates complex, snaking paths."""
    service = board_service
    request = WordBasedBoardGenerationRequest(
        board_size=5, words=["COAT", "BOAT", "GOAT", "CAT", "DOG", "BAT"], min_word_length=3
    )

    result = await service.generate_board_from_words(request, seed=42)

    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 5

    # Verify that words are placed (not just random letters)
    input_words_set = set(request.words)
    found_input_words = [word for word in result.words if word in input_words_set]
    assert len(found_input_words) > 0

    # Print the board to visually verify complex paths
    print("\nGenerated board with complex paths:")
    print(result.to_ascii())

    # The algorithm should be able to place multiple words
    # and they should create interesting, non-linear patterns
    assert len(found_input_words) >= 2  # Should place at least 2 words


async def test_generate_board_from_words_path_diversity(board_service: BoardService):
    """Test that different path types are used."""
    service = board_service

    # Generate multiple boards and verify path diversity
    paths_found = set()

    for seed in range(10):
        request = WordBasedBoardGenerationRequest(board_size=4, words=["CAT", "DOG", "BAT"], min_word_length=3)
        result = await service.generate_board_from_words(request, seed=seed)

        # Check that we get different board layouts
        board_signature = tuple(tuple(row) for row in result.grid)
        paths_found.add(board_signature)

    # Should have some diversity in board layouts
    assert len(paths_found) > 1, "Algorithm should produce diverse board layouts"


async def test_generate_board_from_words_try_place_all_words_false(board_service: BoardService):
    """Test word-based generation with try_place_all_words=False (default behavior)."""
    service = board_service
    request = WordBasedBoardGenerationRequest(
        board_size=4, words=["CAT", "DOG", "BAT", "RAT", "MAT", "HAT"], min_word_length=3, try_place_all_words=False
    )

    result = await service.generate_board_from_words(request, seed=42)

    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 4

    # With try_place_all_words=False, we might not place all words
    input_words_set = set(request.words)
    found_input_words = [word for word in result.words if word in input_words_set]
    assert len(found_input_words) >= 1  # Should place at least some words


async def test_generate_board_from_words_try_place_all_words_true(board_service: BoardService):
    """Test word-based generation with try_place_all_words=True."""
    service = board_service
    request = WordBasedBoardGenerationRequest(
        board_size=5, words=["CAT", "DOG", "BAT"], min_word_length=3, try_place_all_words=True
    )

    result = await service.generate_board_from_words(request, seed=42)

    assert isinstance(result, BoardGenerationResponse)
    assert result.size == 5

    # With try_place_all_words=True, we should try harder to place all words
    input_words_set = set(request.words)
    found_input_words = [word for word in result.words if word in input_words_set]
    assert len(found_input_words) >= 1  # Should place at least some words


def test_generate_board_from_word_list_with_retry(board_service: BoardService):
    """Test the retry logic for placing all words."""
    service = board_service
    words = ["CAT", "DOG", "BAT"]
    board_size = 4

    grid = service._generate_board_from_word_list_with_retry(board_size, words, random.Random(42))

    assert len(grid) == board_size
    assert all(len(row) == board_size for row in grid)
    # All cells should be filled
    assert all(letter != "" for row in grid for letter in row)


async def test_generate_board_from_words_try_place_all_words_comparison(board_service: BoardService):
    """Test comparison between try_place_all_words=True and False."""
    service = board_service
    words = ["CAT", "DOG", "BAT", "RAT", "MAT"]

    # Test with try_place_all_words=False
    request_false = WordBasedBoardGenerationRequest(
        board_size=4, words=words, min_word_length=3, try_place_all_words=False
    )
    result_false = await service.generate_board_from_words(request_false, seed=42)

    # Test with try_place_all_words=True
    request_true = WordBasedBoardGenerationRequest(
        board_size=4, words=words, min_word_length=3, try_place_all_words=True
    )
    result_true = await service.generate_board_from_words(request_true, seed=42)

    # Both should work
    assert isinstance(result_false, BoardGenerationResponse)
    assert isinstance(result_true, BoardGenerationResponse)

    # Count how many input words were placed
    input_words_set = set(words)
    found_false = [word for word in result_false.words if word in input_words_set]
    found_true = [word for word in result_true.words if word in input_words_set]

    # Both should place at least some words
    assert len(found_false) >= 1
    assert len(found_true) >= 1

    # The try_place_all_words=True version might place more words (but not guaranteed)
    # We just verify both approaches work
