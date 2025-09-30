import React, { useState } from 'react';
import './StartupPopup.css';

interface StartupPopupProps {
  day: string;
  isDictionaryLoaded: boolean;
  onPlay: () => void;
}

export const StartupPopup: React.FC<StartupPopupProps> = ({
  day,
  isDictionaryLoaded,
  onPlay,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  const formatDate = (dateStr: string) => {
    // Parse the date string directly without timezone conversion
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="startup-popup-overlay">
      {/* Info button positioned at top right */}
      <button
        className="info-button-top-right"
        onClick={() => setShowInfo(true)}
        title="Game Rules & Scoring"
      >
        i
      </button>

      <div className="startup-popup">
        <div className="startup-popup-content">
          <h1 className="startup-title">Word Hunt: Icebreaker</h1>

          <div className="startup-day">
            <span className="day-label">Today's Puzzle:</span>
            <span className="day-value">{formatDate(day)}</span>
          </div>

          <button
            className={`startup-play-button ${!isDictionaryLoaded ? 'disabled' : ''}`}
            onClick={onPlay}
            disabled={!isDictionaryLoaded}
          >
            {isDictionaryLoaded ? 'Play' : 'Loading Dictionary...'}
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="info-modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="info-modal" onClick={e => e.stopPropagation()}>
            <div className="info-header">
              <h2>How to Play</h2>
              <button
                className="close-button"
                onClick={() => setShowInfo(false)}
              >
                ✕
              </button>
            </div>

            <div className="info-content">
              <div className="info-section">
                <h3>🎯 Objective</h3>
                <p>
                  Find as many words as possible by connecting adjacent letters
                  on the board.
                </p>
              </div>

              <div className="info-section">
                <h3>📝 Rules</h3>
                <ul>
                  <li>Words must be at least 3 letters long</li>
                  <li>
                    Connect letters horizontally, vertically, or diagonally
                  </li>
                  <li>Each letter can only be used once per word</li>
                  <li>You have 2 minutes to find words</li>
                  <li>You can only play once per day</li>
                </ul>
              </div>

              <div className="info-section">
                <h3>🏆 Scoring</h3>
                <ul>
                  <li>
                    <strong>Base Score:</strong> Longer words = more points
                  </li>
                  <li>
                    <strong>Stress Levels:</strong> Red tiles (stressed) give
                    bonus points
                  </li>
                  <li>
                    <strong>Depth Bonus:</strong> Tiles that have been used more
                    give extra points
                  </li>
                  <li>
                    <strong>Combo Multipliers:</strong> All red tiles or all
                    same stress level = bonus
                  </li>
                  <li>
                    <strong>Rounding:</strong> All scores rounded to nearest 25
                  </li>
                </ul>
              </div>

              <div className="info-section">
                <h3>💡 Tips</h3>
                <ul>
                  <li>
                    Look for longer words first - they're worth more points
                  </li>
                  <li>
                    Red tiles are your friends - use them for bonus points
                  </li>
                  <li>Try to use tiles multiple times for depth bonuses</li>
                  <li>Plan your path before selecting letters</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
