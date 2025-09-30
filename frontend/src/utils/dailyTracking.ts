// Daily play tracking utilities
const PLAYED_DAYS_KEY = 'wordhunt-played-days';
const DAILY_RESULTS_KEY = 'wordhunt-daily-results';

export const hasPlayedToday = (currentDay: string): boolean => {
  try {
    const playedDays = JSON.parse(
      localStorage.getItem(PLAYED_DAYS_KEY) || '[]'
    );
    return playedDays.includes(currentDay);
  } catch {
    return false;
  }
};

export const markDayAsPlayed = (currentDay: string): void => {
  try {
    const playedDays = JSON.parse(
      localStorage.getItem(PLAYED_DAYS_KEY) || '[]'
    );
    if (!playedDays.includes(currentDay)) {
      playedDays.push(currentDay);
      localStorage.setItem(PLAYED_DAYS_KEY, JSON.stringify(playedDays));
    }
  } catch {
    // If localStorage fails, silently continue
  }
};

export const getPlayedDays = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(PLAYED_DAYS_KEY) || '[]');
  } catch {
    return [];
  }
};

// Daily results storage
export interface DailyResult {
  day: string;
  words: Array<{
    word: string;
    score: number;
    stressLevels: number[];
    timestamp: number;
  }>;
  maxScore: number;
  totalScore: number;
  wordCount: number;
}

export const saveDailyResults = (
  day: string,
  words: DailyResult['words']
): void => {
  try {
    const maxScore = Math.max(...words.map(w => w.score), 0);
    const totalScore = words.reduce((sum, w) => sum + w.score, 0);

    const result: DailyResult = {
      day,
      words,
      maxScore,
      totalScore,
      wordCount: words.length,
    };

    localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(result));
  } catch {
    // If localStorage fails, silently continue
  }
};

export const getDailyResults = (): DailyResult | null => {
  try {
    const result = localStorage.getItem(DAILY_RESULTS_KEY);
    return result ? JSON.parse(result) : null;
  } catch {
    return null;
  }
};
