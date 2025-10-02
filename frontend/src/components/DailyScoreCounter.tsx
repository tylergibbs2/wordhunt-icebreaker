import React, { useState, useEffect } from 'react';
import './DailyScoreCounter.css';

interface DailyScoreCounterProps {
  totalScore: number;
}

export const DailyScoreCounter: React.FC<DailyScoreCounterProps> = ({
  totalScore,
}) => {
  const [displayScore, setDisplayScore] = useState(totalScore);
  const [animatingDigits, setAnimatingDigits] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (totalScore !== displayScore) {
      // Always use 6 digits for consistent comparison
      const paddedScore = totalScore.toString().padStart(6, '0');
      const paddedDisplay = displayScore.toString().padStart(6, '0');
      
      // Find which digits need to change
      const changingDigits: number[] = [];
      paddedScore.split('').forEach((char, index) => {
        const displayChar = paddedDisplay[index];
        if (char !== displayChar) {
          changingDigits.push(index);
        }
      });
      
      // If no digits are changing, just update the display score
      if (changingDigits.length === 0) {
        setDisplayScore(totalScore);
        return;
      }
      
      // Animate each changing digit with Vestaboard-style staggered timing
      changingDigits.forEach((digitIndex, animationIndex) => {
        setTimeout(() => {
          // Add this digit to animating set
          setAnimatingDigits(prev => new Set([...prev, digitIndex]));
          
          // Update the digit value at the midpoint of the animation (when it's "edge-on")
          setTimeout(() => {
            setDisplayScore(prev => {
              const prevStr = prev.toString().padStart(6, '0');
              const newStr = prevStr.split('');
              newStr[digitIndex] = paddedScore[digitIndex];
              return parseInt(newStr.join(''), 10);
            });
          }, 150); // Update at 50% of the 300ms animation

          // Remove from animating set after animation completes
          setTimeout(() => {
            setAnimatingDigits(prev => {
              const newSet = new Set(prev);
              newSet.delete(digitIndex);
              return newSet;
            });
          }, 300); // Match the CSS animation duration
        }, animationIndex * 75); // Stagger the animation start
      });
    }
  }, [totalScore, displayScore]);

  const scoreStr = displayScore.toString();
  const paddedScore = scoreStr.padStart(6, '0'); // Always show 6 digits

  return (
    <div className="daily-score-counter">
      <div className="score-label">SCORE</div>
      <div className="score-digits">
        {paddedScore.split('').map((digit, index) => (
          <span
            key={index}
            className={`score-digit ${animatingDigits.has(index) ? 'digit-animating' : ''}`}
          >
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
};
