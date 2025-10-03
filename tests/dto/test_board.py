import pytest

from app.dto.board import (
    BoardGenerationRequest,
    BoardGenerationResponse,
    MoveValidationRequest,
    MoveValidationResponse,
    UnresolvedBoard,
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
