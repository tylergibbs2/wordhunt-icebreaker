import React, { useState } from 'react';
import './StartupPopup.css';
import { InfoModal } from './InfoModal';

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

      {/* GitHub link positioned at bottom right */}
      <a
        href="https://github.com/tylergibbs2/wordhunt-icebreaker"
        target="_blank"
        rel="noopener noreferrer"
        className="github-link-page"
        title="View source code on GitHub"
      >
        GitHub
      </a>

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
      <InfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        day={day}
      />
    </div>
  );
};
