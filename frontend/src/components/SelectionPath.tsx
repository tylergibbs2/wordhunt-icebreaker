import React from 'react';
import type { TilePosition } from '../hooks/useTileSelection';

interface SelectionPathProps {
  selectedTiles: TilePosition[];
  boardDimensions: { width: number; height: number };
  gridSize: number;
  pathColor?: string;
}

export const SelectionPath: React.FC<SelectionPathProps> = ({
  selectedTiles,
  boardDimensions,
  gridSize,
  pathColor = '#60a5fa',
}) => {
  if (
    selectedTiles.length === 0 ||
    boardDimensions.width === 0 ||
    gridSize === 0
  ) {
    return null;
  }

  const cellSize = boardDimensions.width / gridSize;

  // Calculate coordinates for a single tile
  const getTileCoordinates = (tile: TilePosition) => {
    const x = (tile.col + 0.5) * cellSize;
    const y = (tile.row + 0.5) * cellSize;
    return { x, y };
  };

  return (
    <svg
      className="selection-path-overlay"
      width={boardDimensions.width}
      height={boardDimensions.height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {selectedTiles.length === 1 ? (
        // Single tile - show pixelated square
        (() => {
          const coords = getTileCoordinates(selectedTiles[0]);
          return (
            <>
              {/* Pixelated square */}
              <rect
                x={coords.x - 16}
                y={coords.y - 16}
                width="32"
                height="32"
                fill={pathColor}
                opacity="0.4"
              />
              {/* Inner highlight */}
              <rect
                x={coords.x - 8}
                y={coords.y - 8}
                width="16"
                height="16"
                fill={pathColor}
                opacity="0.4"
              />
            </>
          );
        })()
      ) : (
        // Multiple tiles - show path
        <>
          {/* Pixelated path using rectangles */}
          {selectedTiles.map((tile, index) => {
            if (index === 0) return null; // Skip first tile, handled by circle

            const coords = getTileCoordinates(tile);
            return (
              <rect
                key={`path-${tile.row}-${tile.col}`}
                x={coords.x - 12}
                y={coords.y - 12}
                width="24"
                height="24"
                fill={pathColor}
                opacity="0.4"
              />
            );
          })}

          {/* Connection lines between tiles */}
          {selectedTiles.map((tile, index) => {
            if (index === selectedTiles.length - 1) return null; // Skip last tile

            const nextTile = selectedTiles[index + 1];
            const coords1 = getTileCoordinates(tile);
            const coords2 = getTileCoordinates(nextTile);

            // Determine if it's horizontal or vertical connection
            if (tile.row === nextTile.row) {
              // Horizontal connection
              return (
                <rect
                  key={`conn-${index}`}
                  x={Math.min(coords1.x, coords2.x) - 12}
                  y={coords1.y - 12}
                  width={Math.abs(coords2.x - coords1.x) + 24}
                  height="24"
                  fill={pathColor}
                  opacity="0.4"
                />
              );
            } else if (tile.col === nextTile.col) {
              // Vertical connection
              return (
                <rect
                  key={`conn-${index}`}
                  x={coords1.x - 12}
                  y={Math.min(coords1.y, coords2.y) - 12}
                  width="24"
                  height={Math.abs(coords2.y - coords1.y) + 24}
                  fill={pathColor}
                  opacity="0.4"
                />
              );
            } else {
              // Diagonal connection - use a single thick line
              return (
                <line
                  key={`diag-${index}`}
                  x1={coords1.x}
                  y1={coords1.y}
                  x2={coords2.x}
                  y2={coords2.y}
                  stroke={pathColor}
                  strokeWidth="24"
                  opacity="0.4"
                  strokeLinecap="round"
                />
              );
            }
          })}

          {/* Direction indicator arrow at the end */}
          {selectedTiles.length > 1 &&
            (() => {
              const lastTile = selectedTiles[selectedTiles.length - 1];
              const secondLastTile = selectedTiles[selectedTiles.length - 2];
              const lastCoords = getTileCoordinates(lastTile);
              const secondLastCoords = getTileCoordinates(secondLastTile);

              // Calculate direction vector
              const dx = lastCoords.x - secondLastCoords.x;
              const dy = lastCoords.y - secondLastCoords.y;

              // Normalize direction
              const length = Math.sqrt(dx * dx + dy * dy);
              const normalizedDx = dx / length;
              const normalizedDy = dy / length;

              // Arrow position (at the edge of the last tile, extending the path)
              const arrowX = lastCoords.x + normalizedDx * 12; // Start at tile edge
              const arrowY = lastCoords.y + normalizedDy * 12;

              // Arrow size
              const arrowSize = 12;

              // Calculate arrow points - tip extends from the path
              const arrowTipX = arrowX + normalizedDx * arrowSize;
              const arrowTipY = arrowY + normalizedDy * arrowSize;

              // Perpendicular vector for arrow wings
              const perpX = -normalizedDy;
              const perpY = normalizedDx;
              const wingLength = 12; // Match the path line width (24px / 2)

              // Base of arrow (at the path edge)
              const baseX = arrowX;
              const baseY = arrowY;

              const wing1X = baseX + perpX * wingLength;
              const wing1Y = baseY + perpY * wingLength;
              const wing2X = baseX - perpX * wingLength;
              const wing2Y = baseY - perpY * wingLength;

              return (
                <polygon
                  points={`${arrowTipX},${arrowTipY} ${wing1X},${wing1Y} ${wing2X},${wing2Y}`}
                  fill={pathColor}
                  opacity="0.6"
                />
              );
            })()}
        </>
      )}
    </svg>
  );
};
