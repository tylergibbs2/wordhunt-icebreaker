import { useState, useCallback } from 'react';

export type TilePosition = {
  row: number;
  col: number;
};

export const useTileSelection = (
  board?: { grid: string[][] },
  onSelectionComplete?: (word: string, isValid: boolean) => void
) => {
  const [selectedTiles, setSelectedTiles] = useState<TilePosition[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastProcessedTile, setLastProcessedTile] =
    useState<TilePosition | null>(null);

  // Check if two tiles are adjacent (including diagonals)
  const areAdjacent = useCallback(
    (pos1: TilePosition, pos2: TilePosition): boolean => {
      const rowDiff = Math.abs(pos1.row - pos2.row);
      const colDiff = Math.abs(pos1.col - pos2.col);
      return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
    },
    []
  );

  // Check if pointer is close enough to tile center to select it
  const isPointerCloseToTileCenter = useCallback(
    (clientX: number, clientY: number, row: number, col: number): boolean => {
      // Get the board element from the event target
      const boardElement = document.querySelector('.board-grid') as HTMLElement;
      if (!boardElement) return false;

      const rect = boardElement.getBoundingClientRect();
      const gridSize = Math.sqrt(boardElement.children.length); // Assuming square grid
      const cellSize = rect.width / gridSize;

      // Calculate tile center coordinates
      const tileCenterX = rect.left + (col + 0.5) * cellSize;
      const tileCenterY = rect.top + (row + 0.5) * cellSize;

      // Calculate distance from pointer to tile center
      const distance = Math.sqrt(
        Math.pow(clientX - tileCenterX, 2) + Math.pow(clientY - tileCenterY, 2)
      );

      // Only select if pointer is within 40% of tile size from center
      const threshold = cellSize * 0.4;
      return distance <= threshold;
    },
    []
  );

  // Check if a tile is already selected
  const isTileSelected = useCallback(
    (row: number, col: number): boolean => {
      return selectedTiles.some(tile => tile.row === row && tile.col === col);
    },
    [selectedTiles]
  );

  // Handle tile selection during drag - build path incrementally with distance threshold
  const handleTileSelect = useCallback(
    (clientX: number, clientY: number, row: number, col: number) => {
      const newTile: TilePosition = { row, col };

      // Don't process the same tile twice in a row
      if (
        lastProcessedTile &&
        lastProcessedTile.row === row &&
        lastProcessedTile.col === col
      ) {
        return;
      }

      // Check if pointer is close enough to tile center
      if (!isPointerCloseToTileCenter(clientX, clientY, row, col)) {
        return;
      }

      if (selectedTiles.length === 0) {
        // First tile selection
        setSelectedTiles([newTile]);
        setLastProcessedTile(newTile);
      } else {
        const lastTile = selectedTiles[selectedTiles.length - 1];

        // Check if the new tile is already in the selection (backtracking)
        const existingTileIndex = selectedTiles.findIndex(
          tile => tile.row === row && tile.col === col
        );

        if (existingTileIndex !== -1) {
          // Backtracking: remove tiles from the end until we reach the existing tile
          if (existingTileIndex < selectedTiles.length - 1) {
            setSelectedTiles(prev => prev.slice(0, existingTileIndex + 1));
            setLastProcessedTile(newTile);
          }
          // If it's the last tile, do nothing (already at the end)
        } else {
          // Forward movement: check if the new tile is adjacent to the last selected tile
          if (areAdjacent(lastTile, newTile)) {
            setSelectedTiles(prev => [...prev, newTile]);
            setLastProcessedTile(newTile);
          }
        }
      }
    },
    [selectedTiles, areAdjacent, lastProcessedTile, isPointerCloseToTileCenter]
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedTiles([]);
    setIsSelecting(false);
    setLastProcessedTile(null);
  }, []);

  // Handle pointer events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, row: number, col: number) => {
      e.preventDefault();
      setIsSelecting(true);
      // Clear any existing selection and start new one
      setSelectedTiles([]);
      setLastProcessedTile(null);
      handleTileSelect(e.clientX, e.clientY, row, col);
    },
    [handleTileSelect]
  );

  // Global pointer move handler for dragging
  const handleGlobalPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isSelecting) {
        e.preventDefault();
        // Find which cell the pointer is over
        const boardElement = document.querySelector(
          '.board-grid'
        ) as HTMLElement;
        if (!boardElement) return;

        const rect = boardElement.getBoundingClientRect();
        const gridSize = Math.sqrt(boardElement.children.length);
        const cellSize = rect.width / gridSize;

        // Calculate which cell the pointer is over
        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;

        const col = Math.floor(relativeX / cellSize);
        const row = Math.floor(relativeY / cellSize);

        // Check if the pointer is within bounds and close to cell center
        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
          const cellCenterX = (col + 0.5) * cellSize;
          const cellCenterY = (row + 0.5) * cellSize;
          const distance = Math.sqrt(
            Math.pow(relativeX - cellCenterX, 2) +
              Math.pow(relativeY - cellCenterY, 2)
          );

          // Only select if close enough to center (same logic as before)
          if (distance <= cellSize * 0.4) {
            handleTileSelect(e.clientX, e.clientY, row, col);
          }
        }
      }
    },
    [isSelecting, handleTileSelect]
  );

  const handlePointerUp = useCallback(() => {
    setIsSelecting(false);

    // Build word from selected tiles and call callback
    if (selectedTiles.length > 0 && board?.grid && onSelectionComplete) {
      const word = selectedTiles
        .map(tile => board.grid[tile.row][tile.col])
        .join('')
        .toLowerCase();

      // For now, we'll pass false as isValid since we don't have dictionary access here
      // The Board component will handle the actual validation
      onSelectionComplete(word, false);
    }

    // Clear selection when dragging stops
    setSelectedTiles([]);
    setLastProcessedTile(null);
  }, [selectedTiles, board, onSelectionComplete]);

  return {
    selectedTiles,
    isSelecting,
    isTileSelected,
    clearSelection,
    handlePointerDown,
    handleGlobalPointerMove,
    handlePointerUp,
  };
};
