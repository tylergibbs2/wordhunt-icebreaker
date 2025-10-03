import React, { useEffect } from 'react';
import { getScoreBreakdown, type TilePosition } from '../utils/scoring';
import './ScoringBreakdown.css';

interface ScoringBreakdownProps {
  word: string;
  selectedTiles: TilePosition[];
  stressLevels: number[][];
  replacementCounts: Map<string, number>;
  score: number;
  isVisible: boolean;
  onComplete: () => void;
}

export const ScoringBreakdown: React.FC<ScoringBreakdownProps> = ({
  word,
  selectedTiles,
  stressLevels,
  replacementCounts,
  score,
  isVisible,
  onComplete,
}) => {
  // Auto-hide after animation completes (4s)
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible || !word || selectedTiles.length === 0) {
    return null;
  }

  const breakdown = getScoreBreakdown(
    word,
    selectedTiles,
    stressLevels,
    replacementCounts
  );

  return (
    <div className="scoring-breakdown-mini">
      <div className="scoring-header-mini">
        <span className="word-text">{word.toUpperCase()}</span>
        <span className="final-score">{score}</span>
      </div>

      <div className="scoring-details-mini">
        <div className="score-line">
          <span>Base:</span>
          <span>{breakdown.baseScore}</span>
        </div>
        <div className="score-line">
          <span>Stress:</span>
          <span>+{breakdown.stressBonus}</span>
        </div>
        <div className="score-line">
          <span>Depth:</span>
          <span>+{breakdown.depthBonus}</span>
        </div>
        <div className="score-line">
          <span>Combo:</span>
          <span>×{breakdown.multiplier}</span>
        </div>
      </div>
    </div>
  );
};
