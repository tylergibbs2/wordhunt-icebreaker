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
        zIndex: 1,
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
                x={coords.x - 8}
                y={coords.y - 8}
                width="16"
                height="16"
                fill={pathColor}
                opacity="0.8"
              />
              {/* Inner highlight */}
              <rect
                x={coords.x - 4}
                y={coords.y - 4}
                width="8"
                height="8"
                fill={pathColor}
                opacity="0.9"
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
                x={coords.x - 6}
                y={coords.y - 6}
                width="12"
                height="12"
                fill={pathColor}
                opacity="0.8"
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
                  x={Math.min(coords1.x, coords2.x) - 3}
                  y={coords1.y - 3}
                  width={Math.abs(coords2.x - coords1.x) + 6}
                  height="6"
                  fill={pathColor}
                  opacity="0.8"
                />
              );
            } else if (tile.col === nextTile.col) {
              // Vertical connection
              return (
                <rect
                  key={`conn-${index}`}
                  x={coords1.x - 3}
                  y={Math.min(coords1.y, coords2.y) - 3}
                  width="6"
                  height={Math.abs(coords2.y - coords1.y) + 6}
                  fill={pathColor}
                  opacity="0.8"
                />
              );
            } else {
              // Diagonal connection - create medium diagonal line using rectangles
              const steps =
                Math.max(
                  Math.abs(coords2.x - coords1.x),
                  Math.abs(coords2.y - coords1.y)
                ) / 2.5;
              const stepX = (coords2.x - coords1.x) / steps;
              const stepY = (coords2.y - coords1.y) / steps;

              return (
                <React.Fragment key={`diag-fragment-${index}`}>
                  {Array.from({ length: Math.floor(steps) }, (_, i) => {
                    const x = coords1.x + stepX * i;
                    const y = coords1.y + stepY * i;
                    return (
                      <rect
                        key={`diag-${index}-${i}`}
                        x={x - 3}
                        y={y - 3}
                        width="6"
                        height="6"
                        fill={pathColor}
                        opacity="0.8"
                      />
                    );
                  })}
                </React.Fragment>
              );
            }
          })}
        </>
      )}
    </svg>
  );
};
