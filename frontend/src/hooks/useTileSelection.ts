import { useState, useCallback, useRef } from 'react';

export type TilePosition = {
  row: number;
  col: number;
};

export type ControlMode = 'drag' | 'click';

export const useTileSelection = (
  board?: { grid: string[][] },
  onSelectionComplete?: (word: string, isValid: boolean) => void
) => {
  const [selectedTiles, setSelectedTiles] = useState<TilePosition[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastProcessedTile, setLastProcessedTile] =
    useState<TilePosition | null>(null);
  const [controlMode, setControlMode] = useState<ControlMode>('drag');

  // Use refs to track interaction state to avoid stale closures
  const interactionStateRef = useRef({
    isFirstTileOfMove: true,
    dragStartPosition: null as { clientX: number; clientY: number } | null,
    hasDragged: false,
    dragThreshold: 8, // pixels
    modeDetectionTimeout: null as NodeJS.Timeout | null,
  });

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

  // Handle click-based tile selection
  const handleTileClick = useCallback(
    (row: number, col: number) => {
      const newTile: TilePosition = { row, col };

      if (selectedTiles.length === 0) {
        // First tile selection
        setSelectedTiles([newTile]);
        setLastProcessedTile(newTile);
      } else {
        // Check if the clicked tile is already in the selection
        const existingTileIndex = selectedTiles.findIndex(
          tile => tile.row === row && tile.col === col
        );

        if (existingTileIndex !== -1) {
          // Tile is already selected - only allow deselecting the last tile (backtracking)
          if (existingTileIndex === selectedTiles.length - 1) {
            // Remove the last tile
            setSelectedTiles(prev => prev.slice(0, -1));
            setLastProcessedTile(
              selectedTiles.length > 1
                ? selectedTiles[selectedTiles.length - 2]
                : null
            );
          }
          // If it's not the last tile, do nothing (don't allow removing tiles from the middle)
        } else {
          // Tile is not selected - check if it's adjacent to the last selected tile
          const lastTile = selectedTiles[selectedTiles.length - 1];
          if (areAdjacent(lastTile, newTile)) {
            setSelectedTiles(prev => [...prev, newTile]);
            setLastProcessedTile(newTile);
          }
        }
      }
    },
    [selectedTiles, areAdjacent]
  );

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedTiles([]);
    setIsSelecting(false);
    setLastProcessedTile(null);

    // Reset interaction state
    interactionStateRef.current.isFirstTileOfMove = true;
    interactionStateRef.current.dragStartPosition = null;
    interactionStateRef.current.hasDragged = false;

    // Clear any pending timeout
    if (interactionStateRef.current.modeDetectionTimeout) {
      clearTimeout(interactionStateRef.current.modeDetectionTimeout);
      interactionStateRef.current.modeDetectionTimeout = null;
    }
  }, []);

  // Handle pointer events
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, row: number, col: number) => {
      e.preventDefault();

      const state = interactionStateRef.current;

      // Record initial position for drag detection
      state.dragStartPosition = { clientX: e.clientX, clientY: e.clientY };
      state.hasDragged = false;

      // Clear any existing timeout
      if (state.modeDetectionTimeout) {
        clearTimeout(state.modeDetectionTimeout);
        state.modeDetectionTimeout = null;
      }

      if (state.isFirstTileOfMove) {
        // First tile of a new move - start fresh
        setSelectedTiles([]);
        setLastProcessedTile(null);
        setIsSelecting(false);

        // Immediately handle the tile click - we'll detect mode based on subsequent movement
        handleTileClick(row, col);
        setControlMode('click'); // Start in click mode by default
      } else {
        // Subsequent tiles - handle based on current mode
        if (controlMode === 'click') {
          handleTileClick(row, col);
        } else {
          // Drag mode - start selecting
          setIsSelecting(true);
          handleTileSelect(e.clientX, e.clientY, row, col);
        }
      }
    },
    [controlMode, handleTileClick, handleTileSelect]
  );

  // Global pointer move handler for dragging
  const handleGlobalPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = interactionStateRef.current;

      // Check for drag movement to detect control mode
      if (state.dragStartPosition && !state.hasDragged) {
        const deltaX = Math.abs(e.clientX - state.dragStartPosition.clientX);
        const deltaY = Math.abs(e.clientY - state.dragStartPosition.clientY);

        if (deltaX > state.dragThreshold || deltaY > state.dragThreshold) {
          state.hasDragged = true;

          // Clear the click detection timeout
          if (state.modeDetectionTimeout) {
            clearTimeout(state.modeDetectionTimeout);
            state.modeDetectionTimeout = null;
          }

          // Switch to drag mode if we're currently in click mode
          if (controlMode === 'click') {
            setControlMode('drag');
            setIsSelecting(true);

            // Don't clear the current selection - preserve the initial tile
            // The user already selected it in click mode, so keep it selected
            // Just continue with drag selection from the current position
          }
        }
      }

      // Continue with drag selection if we're in drag mode and selecting
      if (isSelecting && controlMode === 'drag') {
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

          // Only select if close enough to center
          if (distance <= cellSize * 0.4) {
            handleTileSelect(e.clientX, e.clientY, row, col);
          }
        }
      }
    },
    [isSelecting, controlMode, handleTileSelect]
  );

  const handlePointerUp = useCallback(() => {
    const state = interactionStateRef.current;

    // Clear any pending timeout
    if (state.modeDetectionTimeout) {
      clearTimeout(state.modeDetectionTimeout);
      state.modeDetectionTimeout = null;
    }

    // Clear drag tracking
    state.dragStartPosition = null;
    state.hasDragged = false;

    // Handle completion based on control mode
    if (controlMode === 'drag' && isSelecting) {
      // Drag mode completion
      setIsSelecting(false);

      // Submit the word if we have tiles selected
      if (selectedTiles.length > 0 && board?.grid && onSelectionComplete) {
        const word = selectedTiles
          .map(tile => board.grid[tile.row][tile.col])
          .join('')
          .toLowerCase();

        onSelectionComplete(word, false);

        // Reset for next move
        state.isFirstTileOfMove = true;
        setSelectedTiles([]);
        setLastProcessedTile(null);
      }
    } else if (controlMode === 'click') {
      // Click mode - don't auto-submit, user will use Enter/Space
      // Just ensure we're not in selecting state
      setIsSelecting(false);

      // Mark that we're no longer on the first tile of the move
      state.isFirstTileOfMove = false;
    }
  }, [selectedTiles, board, onSelectionComplete, controlMode, isSelecting]);

  // Submit word in click mode
  const submitWord = useCallback(() => {
    if (selectedTiles.length > 0 && board?.grid && onSelectionComplete) {
      const word = selectedTiles
        .map(tile => board.grid[tile.row][tile.col])
        .join('')
        .toLowerCase();

      onSelectionComplete(word, false);

      // Clear selection after submitting
      setSelectedTiles([]);
      setLastProcessedTile(null);
      interactionStateRef.current.isFirstTileOfMove = true;
    }
  }, [selectedTiles, board, onSelectionComplete]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Backspace' && selectedTiles.length > 0) {
        event.preventDefault();
        clearSelection();
      } else if (controlMode === 'click' && selectedTiles.length > 0) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          submitWord();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          clearSelection();
        }
      }
    },
    [selectedTiles.length, clearSelection, controlMode, submitWord]
  );

  return {
    selectedTiles,
    isSelecting,
    isTileSelected,
    controlMode,
    clearSelection,
    handleKeyDown,
    handlePointerDown,
    handleGlobalPointerMove,
    handlePointerUp,
    submitWord,
  };
};
