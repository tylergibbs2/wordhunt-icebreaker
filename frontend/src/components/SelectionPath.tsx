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
        // Multiple tiles - show continuous path
        <>
          {/* Single continuous path */}
          {(() => {
            if (selectedTiles.length < 2) return null;

            // Build the path string
            let pathData = '';
            const firstCoords = getTileCoordinates(selectedTiles[0]);
            pathData += `M ${firstCoords.x} ${firstCoords.y}`;

            // Add lines to each subsequent tile
            for (let i = 1; i < selectedTiles.length; i++) {
              const coords = getTileCoordinates(selectedTiles[i]);
              pathData += ` L ${coords.x} ${coords.y}`;
            }

            return (
              <path
                d={pathData}
                stroke={pathColor}
                strokeWidth="24"
                fill="none"
                opacity="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })()}

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
