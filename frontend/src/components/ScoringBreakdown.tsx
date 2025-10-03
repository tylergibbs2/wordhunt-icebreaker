import React, { useEffect } from 'react';
import {
  getScoreBreakdown,
  SCORING,
  type TilePosition,
} from '../utils/scoring';
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

  // Get letter bonus details
  const letterBonusDetails = word
    .toUpperCase()
    .split('')
    .map(letter => ({
      letter,
      bonus:
        SCORING.LETTER_BONUSES[letter as keyof typeof SCORING.LETTER_BONUSES] ||
        0,
    }))
    .filter(detail => detail.bonus > 0);

  const letterBonusText =
    letterBonusDetails.length > 0
      ? letterBonusDetails.map(d => `${d.letter}(+${d.bonus})`).join(' ')
      : 'None';

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
          <span>Letters:</span>
          <span>+{breakdown.letterBonus}</span>
        </div>
        <div className="score-line letter-details">
          <span>Rare:</span>
          <span>{letterBonusText}</span>
        </div>
        <div className="score-line">
          <span>Combo:</span>
          <span>×{breakdown.multiplier}</span>
        </div>
      </div>
    </div>
  );
};
