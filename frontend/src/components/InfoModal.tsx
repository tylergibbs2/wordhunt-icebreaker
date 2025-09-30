import React from 'react';
import './InfoModal.css';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  day,
}) => {
  if (!isOpen) return null;

  // Check if it's Friday (assuming day format is YYYY-MM-DD)
  const isFriday = new Date(day).getDay() === 5;

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={e => e.stopPropagation()}>
        <div className="info-header">
          <h2>How to Play</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="info-content">
          <div className="info-section">
            <h3>🎯 Goal</h3>
            <p>
              Find words by connecting adjacent letters. Longer words = more
              points!
            </p>
          </div>

          <div className="info-section">
            <h3>📝 Rules</h3>
            <ul>
              <li>Words must be 3+ letters</li>
              <li>Connect horizontally, vertically, or diagonally</li>
              <li>Each letter used once per word</li>
              <li>90 seconds to find words</li>
              <li>One game per day</li>
            </ul>
          </div>

          {isFriday && (
            <div className="info-section friday-special">
              <h3>🎉 Friday Special!</h3>
              <p>5x5 board + 2 minutes timer!</p>
            </div>
          )}

          <div className="info-section">
            <h3>🏆 Scoring</h3>
            <ul>
              <li>
                <strong>Base:</strong> Longer words = more points
              </li>
              <li>
                <strong>Red tiles:</strong> Bonus points
              </li>
              <li>
                <strong>Depth:</strong> Reused tiles = extra points
              </li>
              <li>
                <strong>Combos:</strong> All same color = multiplier
              </li>
            </ul>
          </div>

          <div className="info-section">
            <h3>💡 Tips</h3>
            <ul>
              <li>Look for longer words first</li>
              <li>Use red tiles for bonuses</li>
              <li>Reuse tiles for depth bonuses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
