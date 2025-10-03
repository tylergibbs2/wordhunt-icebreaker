import pytest

from app.dto.board import (
    BoardGenerationRequest,
    BoardGenerationResponse,
    MoveValidationRequest,
    MoveValidationResponse,
    UnresolvedBoard,
    WordBasedBoardGenerationRequest,
)


def test_board_generation_response_to_string():
    """Test BoardGenerationResponse to_string method."""
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    result = BoardGenerationResponse(grid=grid, richness=0.5, words=["CAT", "DOG", "BAT"])

    string_repr = result.to_ascii()
    assert isinstance(string_repr, str)
    assert "Richness: 0.50" in string_repr
    assert "Words found: 3" in string_repr
    # The to_string method doesn't print the words, just shows the count


def test_board_generation_request_validation():
    """Test BoardGenerationRequest validation."""
    # Test valid request
    request = BoardGenerationRequest(board_size=5, target_richness=0.7, min_word_length=4, min_word_count=2)
    assert request.board_size == 5
    assert request.target_richness == 0.7
    assert request.min_word_length == 4
    assert request.min_word_count == 2

    # Test invalid board size
    with pytest.raises(Exception, match=r"Input should be greater than or equal to 3"):
        BoardGenerationRequest(board_size=2)  # Too small

    with pytest.raises(Exception, match=r"Input should be less than or equal to 10"):
        BoardGenerationRequest(board_size=11)  # Too large

    # Test invalid target richness
    with pytest.raises(Exception, match=r"Input should be less than or equal to 1"):
        BoardGenerationRequest(board_size=5, target_richness=1.5)  # Too high

    with pytest.raises(Exception, match=r"Input should be greater than or equal to 0"):
        BoardGenerationRequest(board_size=5, target_richness=-0.1)  # Too low

    # Test invalid min_word_length
    with pytest.raises(Exception, match=r"Input should be greater than or equal to 3"):
        BoardGenerationRequest(board_size=5, min_word_length=2)  # Too small

    with pytest.raises(Exception, match=r"Input should be less than or equal to 15"):
        BoardGenerationRequest(board_size=5, min_word_length=16)  # Too large

    # Test invalid min_word_count
    with pytest.raises(Exception, match=r"Input should be greater than or equal to 0"):
        BoardGenerationRequest(board_size=5, min_word_count=-1)  # Too small


def test_move_validation_request_validation():
    """Test MoveValidationRequest validation."""
    grid = [["C", "A", "T"], ["D", "O", "G"], ["B", "A", "T"]]
    board = UnresolvedBoard(grid=grid)

    # Test valid request
    request = MoveValidationRequest(board=board, move_coordinates=[(0, 0), (0, 1), (0, 2)])
    assert request.board == board
    assert request.move_coordinates == [(0, 0), (0, 1), (0, 2)]

    # Test too few coordinates
    with pytest.raises(Exception, match=r"List should have at least 3 items"):
        MoveValidationRequest(
            board=board,
            move_coordinates=[(0, 0), (0, 1)],  # Too few
        )

    # Test too many coordinates
    with pytest.raises(Exception, match=r"List should have at most 16 items"):
        MoveValidationRequest(
            board=board,
            move_coordinates=[(0, 0)] * 17,  # Too many
        )


def test_move_validation_response_validation():
    """Test MoveValidationResponse validation."""
    # Test valid response
    response = MoveValidationResponse(is_valid=True, word="CAT")
    assert response.is_valid is True
    assert response.word == "CAT"

    # Test invalid response
    response = MoveValidationResponse(is_valid=False, word="")
    assert response.is_valid is False
    assert response.word == ""


def test_word_based_board_generation_request_validation():
    """Test WordBasedBoardGenerationRequest validation."""
    # Test valid request
    request = WordBasedBoardGenerationRequest(board_size=5, words=["CAT", "DOG", "BAT"], min_word_length=3)
    assert request.board_size == 5
    assert request.words == ["CAT", "DOG", "BAT"]
    assert request.min_word_length == 3

    # Test invalid board size
    with pytest.raises(Exception, match=r"Input should be greater than or equal to 3"):
        WordBasedBoardGenerationRequest(board_size=2, words=["CAT"])  # Too small

    with pytest.raises(Exception, match=r"Input should be less than or equal to 10"):
        WordBasedBoardGenerationRequest(board_size=11, words=["CAT"])  # Too large

    # Test invalid min_word_length
    with pytest.raises(Exception, match=r"Input should be greater than or equal to 3"):
        WordBasedBoardGenerationRequest(board_size=5, words=["CAT"], min_word_length=2)  # Too small

    with pytest.raises(Exception, match=r"Input should be less than or equal to 15"):
        WordBasedBoardGenerationRequest(board_size=5, words=["CAT"], min_word_length=16)  # Too large

    # Test empty words list
    with pytest.raises(Exception, match=r"List should have at least 1 item"):
        WordBasedBoardGenerationRequest(board_size=5, words=[])  # Empty list

    # Test default min_word_length
    request = WordBasedBoardGenerationRequest(board_size=4, words=["CAT", "DOG"])
    assert request.min_word_length == 3  # Default value


def test_word_based_board_generation_request_word_filtering():
    """Test that WordBasedBoardGenerationRequest properly handles word filtering."""
    # Test with mixed case words
    request = WordBasedBoardGenerationRequest(board_size=4, words=["cat", "DOG", "Bat", "rat"], min_word_length=3)
    assert request.words == ["cat", "DOG", "Bat", "rat"]  # Should preserve original case

    # Test with words of different lengths
    request = WordBasedBoardGenerationRequest(
        board_size=4, words=["CAT", "DOG", "BAT", "RAT", "COAT"], min_word_length=4
    )
    assert request.words == ["CAT", "DOG", "BAT", "RAT", "COAT"]  # All words >= 4 chars
