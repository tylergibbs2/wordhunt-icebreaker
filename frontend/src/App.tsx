import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { DictionaryProvider } from './components/DictionaryProvider';
import { Board } from './components/Board';
import { StartupPopup } from './components/StartupPopup';
import { GameResults, type WordResult } from './components/GameResults';
import { Loading } from './components/Loading';
import { queryClient } from './lib/queryClient';
import { useBoard } from './hooks/useBoard';
import { useDictionaryContext } from './components/DictionaryProvider';
import { hasPlayedToday, getDailyResults } from './utils/dailyTracking';

function AppContent() {
  const [showBoard, setShowBoard] = useState(false);
  const { day } = useBoard();
  const { isLoading: dictionaryLoading } = useDictionaryContext();

  const handlePlay = () => {
    setShowBoard(true);
  };

  if (!showBoard) {
    if (!day) {
      // If no day from API, show loading or error
      return <Loading />;
    }

    const alreadyPlayed = hasPlayedToday(day);
    const dailyResults = getDailyResults();

    // If already played, show the results screen directly
    if (alreadyPlayed && dailyResults) {
      const wordResults: WordResult[] = dailyResults.words.map(word => ({
        word: word.word,
        score: word.score,
        stressLevels: word.stressLevels,
        timestamp: word.timestamp,
      }));

      return <GameResults words={wordResults} title="Results" day={day} />;
    }

    // Otherwise show the startup popup
    return (
      <StartupPopup
        day={day}
        isDictionaryLoaded={!dictionaryLoading}
        onPlay={handlePlay}
      />
    );
  }

  return <Board />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DictionaryProvider>
        <AppContent />
      </DictionaryProvider>
    </QueryClientProvider>
  );
}

export default App;
