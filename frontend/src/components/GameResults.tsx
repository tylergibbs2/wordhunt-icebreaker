import React from 'react';
import './GameResults.css';

export interface WordResult {
  word: string;
  score: number;
  stressLevels: number[];
  timestamp: number;
}

interface GameResultsProps {
  words: WordResult[];
  title?: string;
  showOverlay?: boolean;
}

export const GameResults: React.FC<GameResultsProps> = ({
  words,
  title = 'Game Complete!',
  showOverlay = true,
}) => {
  const maxScore = Math.max(...words.map(w => w.score), 0);
  const totalScore = words.reduce((sum, w) => sum + w.score, 0);

  // Sort words by score (highest to lowest)
  const sortedWords = [...words].sort((a, b) => b.score - a.score);

  const getStressColor = (stressLevel: number) => {
    switch (stressLevel) {
      case 0:
        return '#ff6666'; // Red
      case 1:
        return '#ffcc66'; // Yellow
      case 2:
        return '#66ff66'; // Green
      default:
        return '#e0e0e0'; // Default
    }
  };

  const getStressLabel = (stressLevel: number) => {
    switch (stressLevel) {
      case 0:
        return 'Red';
      case 1:
        return 'Yellow';
      case 2:
        return 'Green';
      default:
        return 'Unknown';
    }
  };

  const handleShareResults = async () => {
    const shareText = `🧊 Just played Word Hunt: Icebreaker!\n\n🏆 Best word: ${maxScore} points\n❄️ Total: ${totalScore} points\n🔍 Found ${words.length} words\n\nCan you beat my score?\n\nhttps://wordhunt.tyler.solutions`;

    // Check if native share API is available (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: '🧊 Word Hunt: Icebreaker',
          text: shareText,
        });
      } catch {
        // User cancelled or error occurred, fall back to clipboard
        await copyToClipboard(shareText);
      }
    } else {
      // Desktop - use clipboard API
      await copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className={showOverlay ? 'game-results-overlay' : ''}>
      <div className="game-results">
        <div className="results-header">
          <h1 className="results-title">{title}</h1>
          <div className="score-summary">
            <div className="max-score">Max Score: {maxScore}</div>
            <div className="total-score">Total Score: {totalScore}</div>
            <div className="word-count">Words Found: {words.length}</div>
          </div>

          <button className="share-results-button" onClick={handleShareResults}>
            Share Results
          </button>
        </div>

        <div className="words-list">
          <h2 className="words-title">Your Words</h2>
          {sortedWords.length === 0 ? (
            <div className="no-words">No words found!</div>
          ) : (
            <div className="words-container">
              {sortedWords.map(wordResult => (
                <div
                  key={`${wordResult.word}-${wordResult.timestamp}`}
                  className="word-item"
                >
                  <div className="word-header">
                    <span className="word-text">{wordResult.word}</span>
                    <span className="word-score">{wordResult.score}</span>
                  </div>
                  <div className="word-stress">
                    {wordResult.word.split('').map((letter, letterIndex) => (
                      <span
                        key={letterIndex}
                        className="stress-letter"
                        style={{
                          color: getStressColor(
                            wordResult.stressLevels[letterIndex]
                          ),
                        }}
                        title={`${letter}: ${getStressLabel(wordResult.stressLevels[letterIndex])}`}
                      >
                        {letter}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="disclaimer">
          <p>Come back tomorrow for a new game!</p>
        </div>
      </div>
    </div>
  );
};
