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

    // Get existing results
    const existingResults = getAllDailyResults();

    // Update or add the new result
    const updatedResults = {
      ...existingResults,
      [day]: result,
    };

    localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(updatedResults));
  } catch {
    // If localStorage fails, silently continue
  }
};

export const getDailyResults = (day?: string): DailyResult | null => {
  try {
    const allResults = getAllDailyResults();
    if (day) {
      return allResults[day] || null;
    }

    // If no day specified, get the most recent result
    const days = Object.keys(allResults).sort(
      (a, b) => parseInt(b) - parseInt(a)
    );
    return days.length > 0 ? allResults[days[0]] : null;
  } catch {
    return null;
  }
};

export const getAllDailyResults = (): Record<string, DailyResult> => {
  try {
    const results = localStorage.getItem(DAILY_RESULTS_KEY);
    return results ? JSON.parse(results) : {};
  } catch {
    return {};
  }
};

export const getHistoricalStats = (): {
  totalDaysPlayed: number;
  bestTotalScore: number;
  bestMaxScore: number;
  averageScore: number;
  totalWordsFound: number;
  bestDay: string;
} => {
  try {
    const allResults = getAllDailyResults();
    const results = Object.values(allResults);

    if (results.length === 0) {
      return {
        totalDaysPlayed: 0,
        bestTotalScore: 0,
        bestMaxScore: 0,
        averageScore: 0,
        totalWordsFound: 0,
        bestDay: '',
      };
    }

    const bestTotalScore = Math.max(...results.map(r => r.totalScore));
    const bestMaxScore = Math.max(...results.map(r => r.maxScore));
    const totalWordsFound = results.reduce((sum, r) => sum + r.wordCount, 0);
    const averageScore =
      results.reduce((sum, r) => sum + r.totalScore, 0) / results.length;

    const bestDayResult = results.find(r => r.totalScore === bestTotalScore);
    const bestDay = bestDayResult ? bestDayResult.day : '';

    return {
      totalDaysPlayed: results.length,
      bestTotalScore,
      bestMaxScore,
      averageScore: Math.round(averageScore),
      totalWordsFound,
      bestDay,
    };
  } catch {
    return {
      totalDaysPlayed: 0,
      bestTotalScore: 0,
      bestMaxScore: 0,
      averageScore: 0,
      totalWordsFound: 0,
      bestDay: '',
    };
  }
};
