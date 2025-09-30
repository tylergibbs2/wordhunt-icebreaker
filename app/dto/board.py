from pydantic import BaseModel, Field, model_validator


class UnresolvedBoard(BaseModel):
    grid: list[list[str]] = Field(..., description="Grid of letters")

    @property
    def size(self) -> int:
        # check if the grid is square
        if not all(len(row) == len(self.grid) for row in self.grid):
            raise ValueError("Grid is not square")

        return len(self.grid)


class BoardGenerationRequest(BaseModel):
    board_size: int = Field(..., ge=3, le=10, description="Size of the board (3-10)")
    target_richness: float = Field(default=0.7, ge=0.0, le=1.0, description="Target richness score (0-1)")
    min_word_length: int = Field(default=3, ge=3, le=15, description="Minimum word length")
    min_word_count: int = Field(default=0, ge=0, description="Minimum number of words required")


class BoardGenerationResponse(UnresolvedBoard):
    richness: float = Field(..., description="0-1 float richness score")
    words: list[str] = Field(..., description="List of words found on the board")

    def to_ascii(self) -> str:
        lines = []
        border = "+" + "--" * self.size + "+"
        lines.append(border)
        for row in self.grid:
            line = "|" + " ".join(row) + "|"
            lines.append(line)
        lines.append(border)
        info = f"Richness: {self.richness:.2f}, Words found: {len(self.words)}"
        return "\n".join([*lines, info])

    def to_unresolved(self) -> UnresolvedBoard:
        return UnresolvedBoard(grid=self.grid)


class MoveValidationRequest(BaseModel):
    """Request model for move validation."""

    board: UnresolvedBoard = Field(description="The board result containing the grid")
    move_coordinates: list[tuple[int, int]] = Field(
        description="List of (row, col) coordinates representing the move path",
        min_length=3,
        max_length=16,
    )
    min_word_length: int = Field(default=3, ge=3, description="Minimum word length")

    @model_validator(mode="after")
    def validate_move_coordinates(self) -> "MoveValidationRequest":
        # calculate the max move length based on the board size
        max_move_length = self.board.size * self.board.size
        if len(self.move_coordinates) > max_move_length:
            raise ValueError(f"Move coordinates must have at most {max_move_length} items")

        # validate that the move coordinates are within the board
        for row, col in self.move_coordinates:
            if row < 0 or row >= self.board.size or col < 0 or col >= self.board.size:
                raise ValueError(f"Move coordinates must be within the board (0, {self.board.size})")

        # validate that moves are adjacent
        for i in range(1, len(self.move_coordinates)):
            prev_row, prev_col = self.move_coordinates[i - 1]
            curr_row, curr_col = self.move_coordinates[i]
            if abs(curr_row - prev_row) > 1 or abs(curr_col - prev_col) > 1:
                raise ValueError("Move coordinates must be adjacent")

        # validate that moves are not duplicate
        if len(set(self.move_coordinates)) != len(self.move_coordinates):
            raise ValueError("Move coordinates must be unique")

        return self


class MoveValidationResponse(BaseModel):
    """Response model for move validation."""

    is_valid: bool = Field(description="Whether the move is valid")
    word: str = Field(description="The word formed by the move")
    score: int = Field(description="The score for the word")
