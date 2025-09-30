import { useState, useEffect, useCallback } from 'react';
import { useBoard } from '../hooks/useBoard';
import { useTileSelection } from '../hooks/useTileSelection';
import { Cell } from './Cell';
import { SelectionPath } from './SelectionPath';
import { ScorePopup } from './ScorePopup';
import { PixelExplosion } from './PixelExplosion';
import { Timer } from './Timer';
import { GameResults, type WordResult } from './GameResults';
import { ErrorPopup } from './ErrorPopup';
import { useDictionaryContext } from './DictionaryProvider';
import { calculateScore, getScoreBreakdown } from '../utils/scoring';
import {
  hasPlayedToday,
  markDayAsPlayed,
  saveDailyResults,
} from '../utils/dailyTracking';
import './Board.css';

export const Board = () => {
  const { board, isLoading, error, refetch, seed, day, timerDuration } =
    useBoard();
  const { isWord } = useDictionaryContext();

  // Initialize stress levels - all cells start at stress level 2 (green)
  const [stressLevels, setStressLevels] = useState<number[][]>([]);
  const [currentBoard, setCurrentBoard] = useState<string[][]>([]);
  const [boardDimensions, setBoardDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [crumblingCells, setCrumblingCells] = useState<Set<string>>(new Set());
  const [fadingInCells, setFadingInCells] = useState<Set<string>>(new Set());
  const [replacementCounts, setReplacementCounts] = useState<
    Map<string, number>
  >(new Map());
  const [scorePopups, setScorePopups] = useState<
    Array<{ id: string; score: number; position: { x: number; y: number } }>
  >([]);
  const [errorPopups, setErrorPopups] = useState<
    Array<{ id: string; message: string; position: { x: number; y: number } }>
  >([]);
  const [shakingTiles, setShakingTiles] = useState<Set<string>>(new Set());
  const [pixelExplosions, setPixelExplosions] = useState<
    Array<{ id: string; x: number; y: number; color: string }>
  >([]);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [wordHistory, setWordHistory] = useState<WordResult[]>([]);

  // Function to remove a score popup when its animation completes
  const removeScorePopup = (id: string) => {
    setScorePopups(prev => prev.filter(popup => popup.id !== id));
  };

  // Function to remove an error popup when its animation completes
  const removeErrorPopup = (id: string) => {
    setErrorPopups(prev => prev.filter(popup => popup.id !== id));
  };

  // Function to remove a pixel explosion when it completes
  const removePixelExplosion = (id: string) => {
    setPixelExplosions(prev => prev.filter(explosion => explosion.id !== id));
  };

  // Timer handlers
  const handleTimeUp = useCallback(() => {
    setGameEnded(true);
    // Mark this day as played and save results
    if (day) {
      markDayAsPlayed(day);
      saveDailyResults(day, wordHistory);
    }
  }, [day, wordHistory]);

  const {
    selectedTiles,
    isTileSelected,
    handlePointerDown,
    handleGlobalPointerMove,
    handlePointerUp,
  } = useTileSelection(
    currentBoard.length > 0 ? { grid: currentBoard } : board,
    word => {
      const isValid = isWord(word);
      const isAlreadyUsed = usedWords.has(word.toLowerCase());
      console.log(
        `Word: "${word}", Valid: ${isValid}, Already Used: ${isAlreadyUsed}`
      );

      // If word is valid but already used, show feedback
      if (isValid && isAlreadyUsed) {
        console.log(`"${word}" has already been used!`);

        // Shake the selected tiles
        const tileKeys = selectedTiles.map(tile => `${tile.row}-${tile.col}`);
        setShakingTiles(new Set(tileKeys));

        // Stop shaking after animation
        setTimeout(() => {
          setShakingTiles(new Set());
        }, 500);

        // Show error popup
        const errorId = `error-${Date.now()}`;
        const errorPosition = {
          x: Math.random() * (boardDimensions.width - 200) + 100, // Random position
          y: Math.random() * (boardDimensions.height - 100) + 50,
        };

        setErrorPopups(prev => [
          ...prev,
          {
            id: errorId,
            message: 'You already used that word!',
            position: errorPosition,
          },
        ]);

        return;
      }

      // If word is valid and not already used, decrement stress levels of involved cells
      if (
        isValid &&
        !isAlreadyUsed &&
        selectedTiles.length > 0 &&
        gameStarted &&
        !gameEnded
      ) {
        // Add word to used words set
        setUsedWords(prev => new Set([...prev, word.toLowerCase()]));

        // Calculate score using the new scoring algorithm
        const score = calculateScore(
          word,
          selectedTiles,
          stressLevels,
          replacementCounts
        );

        // Track word history with stress levels
        const wordStressLevels = selectedTiles.map(
          tile => stressLevels[tile.row][tile.col]
        );
        const wordResult: WordResult = {
          word: word.toLowerCase(),
          score,
          stressLevels: wordStressLevels,
          timestamp: Date.now(),
        };
        setWordHistory(prev => [...prev, wordResult]);

        // Log score breakdown for debugging
        const breakdown = getScoreBreakdown(
          word,
          selectedTiles,
          stressLevels,
          replacementCounts
        );
        console.log('Score Breakdown:', breakdown);

        // Add score popup
        const popupId = `score-${Date.now()}-${Math.random()}`;
        const popupPosition = {
          x:
            Math.random() * (window.innerWidth * 0.6) + window.innerWidth * 0.2, // Random position in middle 60% of screen
          y: window.innerHeight * 0.2, // Near the top
        };

        setScorePopups(prev => [
          ...prev,
          { id: popupId, score, position: popupPosition },
        ]);
        setStressLevels(prevStressLevels => {
          const newStressLevels = prevStressLevels.map(row => [...row]); // Deep copy

          selectedTiles.forEach(tile => {
            const currentStress = newStressLevels[tile.row][tile.col];
            // Decrement stress level (2 -> 1 -> 0, but don't go below 0)
            newStressLevels[tile.row][tile.col] = Math.max(
              0,
              currentStress - 1
            );
          });

          return newStressLevels;
        });

        // Also update the current board - replace characters for cells that are already at stress 0
        setCurrentBoard(prevBoard => {
          const newBoard = prevBoard.map(row => [...row]); // Deep copy

          selectedTiles.forEach(tile => {
            const currentStress = stressLevels[tile.row]?.[tile.col] ?? 2;
            // Only replace character if cell is already at stress 0 (red) and being used again
            if (currentStress === 0) {
              // Trigger pixel explosion
              const cellKey = `${tile.row}-${tile.col}`;
              const explosionId = `explosion-${Date.now()}-${Math.random()}`;

              // Get cell position for explosion
              const boardElement = document.querySelector(
                '.board-grid'
              ) as HTMLElement;
              if (boardElement) {
                const rect = boardElement.getBoundingClientRect();
                const gridSize = Math.sqrt(boardElement.children.length);
                const cellSize = rect.width / gridSize;

                const cellX = rect.left + (tile.col + 0.5) * cellSize;
                const cellY = rect.top + (tile.row + 0.5) * cellSize;

                // Get cell color based on stress level
                const cellColor = '#ffb3b3'; // Red color for stress level 0

                setPixelExplosions(prev => [
                  ...prev,
                  {
                    id: explosionId,
                    x: cellX,
                    y: cellY,
                    color: cellColor,
                  },
                ]);
              }

              setCrumblingCells(prev => new Set([...prev, cellKey]));

              // Replace character after crumbling animation is halfway done
              setTimeout(() => {
                // Get current replacement count for this cell
                const currentCount = replacementCounts.get(cellKey) || 0;
                const newCount = currentCount + 1;

                // Update replacement count
                setReplacementCounts(prev =>
                  new Map(prev).set(cellKey, newCount)
                );

                // Generate new letter with updated replacement count
                newBoard[tile.row][tile.col] = generateRandomLetter(
                  { row: tile.row, col: tile.col },
                  newCount
                );

                // Trigger fade-in animation for the new character
                setFadingInCells(prev => new Set([...prev, cellKey]));

                // Remove from fade-in set after animation completes
                setTimeout(() => {
                  setFadingInCells(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(cellKey);
                    return newSet;
                  });
                }, 300);
              }, 300);

              // Remove from crumbling set after animation completes
              setTimeout(() => {
                setCrumblingCells(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(cellKey);
                  return newSet;
                });
              }, 300);
            }
          });

          return newBoard;
        });

        // Reset stress levels for cells that got new characters
        setStressLevels(prevStressLevels => {
          const newStressLevels = prevStressLevels.map(row => [...row]); // Deep copy

          selectedTiles.forEach(tile => {
            const currentStress = stressLevels[tile.row]?.[tile.col] ?? 2;
            // Reset stress to 2 (green) for cells that were at stress 0 and got new characters
            if (currentStress === 0) {
              newStressLevels[tile.row][tile.col] = 2;
            }
          });

          return newStressLevels;
        });
      }
    }
  );

  // Initialize stress levels and current board when board loads
  useEffect(() => {
    if (board?.grid) {
      setStressLevels(board.grid.map(row => row.map(() => 2)));
      setCurrentBoard(board.grid.map(row => [...row])); // Deep copy of original board
      setReplacementCounts(new Map()); // Reset replacement counts for new board
      setUsedWords(new Set()); // Reset used words for new board
    }
  }, [board]);

  // Check if user has already played today
  useEffect(() => {
    if (day) {
      const playedToday = hasPlayedToday(day);
      if (playedToday) {
        setGameEnded(true);
      }
    }
  }, [day]);

  // Initialize timer when board loads
  useEffect(() => {
    if (timerDuration && !gameEnded) {
      setTimeRemaining(timerDuration);
      setIsTimerActive(true);
      setGameStarted(true);
    }
  }, [timerDuration, gameEnded]);

  // Timer countdown effect
  useEffect(() => {
    if (!isTimerActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsTimerActive(false);
          setGameEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeRemaining]);

  // Seeded random number generator (Linear Congruential Generator)
  const seededRandom = (seed: number) => {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    };
  };

  // Generate a deterministic random letter (A-Z) using seed and replacement count
  const generateRandomLetter = (
    position: { row: number; col: number },
    replacementCount: number = 0
  ) => {
    if (!seed) return String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Fallback

    // Create a unique seed for this position by combining board seed with position and replacement count
    const positionSeed =
      seed + position.row * 1000 + position.col + replacementCount * 10000;
    const random = seededRandom(positionSeed);

    // Generate multiple random numbers to ensure good distribution
    for (let i = 0; i < 10; i++) {
      random();
    }

    return String.fromCharCode(65 + Math.floor(random() * 26)); // A-Z
  };

  // Update board dimensions when component mounts or board changes
  useEffect(() => {
    const updateDimensions = () => {
      const boardElement = document.querySelector('.board-grid') as HTMLElement;
      if (boardElement) {
        const rect = boardElement.getBoundingClientRect();
        setBoardDimensions({ width: rect.width, height: rect.height });
      }
    };

    // Update dimensions after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(updateDimensions, 100);

    // Also update on window resize
    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [board]);

  if (isLoading) {
    return <div className="board-loading">Loading board...</div>;
  }

  if (error) {
    return (
      <div className="board-error">
        <p>Error loading board: {error.message}</p>
        <button onClick={() => refetch()} className="board-error-button">
          Retry
        </button>
      </div>
    );
  }

  if (!board || !board.grid) {
    return <div className="board-loading">No board data available</div>;
  }

  const gridSize = currentBoard.length;

  // Show game results if game ended
  if (gameEnded) {
    return <GameResults words={wordHistory} />;
  }

  return (
    <div className="board-container">
      {/* Timer */}
      <Timer
        duration={timerDuration || 90}
        onTimeUp={handleTimeUp}
        isActive={gameStarted && !gameEnded}
      />
      <div className="board-wrapper">
        <div
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
          onPointerMove={handleGlobalPointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {currentBoard.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const isSelected = isTileSelected(rowIndex, colIndex);
              const stressLevel = stressLevels[rowIndex]?.[colIndex] ?? 2;
              const cellKey = `${rowIndex}-${colIndex}`;
              const isCrumbling = crumblingCells.has(cellKey);
              const isFadingIn = fadingInCells.has(cellKey);
              const isShaking = shakingTiles.has(cellKey);

              return (
                <Cell
                  key={`${rowIndex}-${colIndex}`}
                  letter={letter}
                  row={rowIndex}
                  col={colIndex}
                  isSelected={isSelected}
                  stressLevel={stressLevel}
                  isCrumbling={isCrumbling}
                  isFadingIn={isFadingIn}
                  isShaking={isShaking}
                  onPointerDown={handlePointerDown}
                />
              );
            })
          )}
        </div>

        {/* Selection path overlay */}
        <SelectionPath
          selectedTiles={selectedTiles}
          boardDimensions={boardDimensions}
          gridSize={currentBoard?.length || 0}
        />
      </div>

      {/* Score popups */}
      {scorePopups.map(popup => (
        <ScorePopup
          key={popup.id}
          score={popup.score}
          position={popup.position}
          onComplete={() => removeScorePopup(popup.id)}
        />
      ))}

      {errorPopups.map(popup => (
        <ErrorPopup
          key={popup.id}
          message={popup.message}
          position={popup.position}
          onComplete={() => removeErrorPopup(popup.id)}
        />
      ))}

      {/* Pixel explosions */}
      {pixelExplosions.map(explosion => (
        <PixelExplosion
          key={explosion.id}
          x={explosion.x}
          y={explosion.y}
          color={explosion.color}
          onComplete={() => removePixelExplosion(explosion.id)}
        />
      ))}
    </div>
  );
};
