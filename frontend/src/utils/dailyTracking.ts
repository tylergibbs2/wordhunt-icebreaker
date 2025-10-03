// Daily play tracking utilities
const PLAYED_DAYS_KEY = 'wordhunt-played-days';
const DAILY_RESULTS_KEY = 'wordhunt-daily-results';

export const hasPlayedToday = (currentDay: string): boolean => {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    const playedDays = JSON.parse(
      localStorage.getItem(PLAYED_DAYS_KEY) || '[]'
    );
    return Array.isArray(playedDays) && playedDays.includes(currentDay);
  } catch (error) {
    console.warn('Failed to check if played today:', error);
    return false;
  }
};

export const markDayAsPlayed = (currentDay: string): void => {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const playedDays = JSON.parse(
      localStorage.getItem(PLAYED_DAYS_KEY) || '[]'
    );

    if (Array.isArray(playedDays) && !playedDays.includes(currentDay)) {
      playedDays.push(currentDay);
      localStorage.setItem(PLAYED_DAYS_KEY, JSON.stringify(playedDays));
    }
  } catch (error) {
    console.warn('Failed to mark day as played:', error);
  }
};

export const getPlayedDays = (): string[] => {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const playedDays = JSON.parse(
      localStorage.getItem(PLAYED_DAYS_KEY) || '[]'
    );
    return Array.isArray(playedDays) ? playedDays : [];
  } catch (error) {
    console.warn('Failed to get played days:', error);
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
    if (typeof localStorage === 'undefined') {
      return;
    }

    // Handle empty words array safely
    const maxScore =
      words.length > 0 ? Math.max(...words.map(w => w.score), 0) : 0;
    const totalScore = words.reduce((sum, w) => sum + w.score, 0);

    const result: DailyResult = {
      day,
      words,
      maxScore,
      totalScore,
      wordCount: words.length,
    };

    // Get existing results (handles both old and new formats)
    const existingResults = getAllDailyResults();

    // Update or add the new result
    const updatedResults = {
      ...existingResults,
      [day]: result,
    };

    localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(updatedResults));
  } catch (error) {
    // If localStorage fails, silently continue
    console.warn('Failed to save daily results:', error);
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
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      return {};
    }

    const results = localStorage.getItem(DAILY_RESULTS_KEY);
    if (!results) {
      return {};
    }

    const parsed = JSON.parse(results);

    // Handle old format (single DailyResult object)
    if (parsed && typeof parsed === 'object' && parsed.day) {
      // This is the old format - return it as a single entry
      return {
        [parsed.day]: {
          day: parsed.day,
          words: Array.isArray(parsed.words) ? parsed.words : [],
          maxScore: typeof parsed.maxScore === 'number' ? parsed.maxScore : 0,
          totalScore:
            typeof parsed.totalScore === 'number' ? parsed.totalScore : 0,
          wordCount:
            typeof parsed.wordCount === 'number' ? parsed.wordCount : 0,
        },
      };
    }

    // Handle new format (Record<string, DailyResult>)
    if (parsed && typeof parsed === 'object' && !parsed.day) {
      // Validate that it's an object with valid results
      const validResults: Record<string, DailyResult> = {};

      for (const [day, result] of Object.entries(parsed)) {
        if (result && typeof result === 'object' && 'day' in result) {
          const dailyResult = result as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          validResults[day] = {
            day: dailyResult.day,
            words: Array.isArray(dailyResult.words) ? dailyResult.words : [],
            maxScore:
              typeof dailyResult.maxScore === 'number'
                ? dailyResult.maxScore
                : 0,
            totalScore:
              typeof dailyResult.totalScore === 'number'
                ? dailyResult.totalScore
                : 0,
            wordCount:
              typeof dailyResult.wordCount === 'number'
                ? dailyResult.wordCount
                : 0,
          };
        }
      }

      return validResults;
    }

    // Invalid format
    return {};
  } catch (error) {
    console.warn('Failed to get daily results:', error);
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

    // Filter out any invalid results
    const validResults = results.filter(
      r =>
        r &&
        typeof r.totalScore === 'number' &&
        typeof r.maxScore === 'number' &&
        typeof r.wordCount === 'number' &&
        !isNaN(r.totalScore) &&
        !isNaN(r.maxScore) &&
        !isNaN(r.wordCount)
    );

    if (validResults.length === 0) {
      return {
        totalDaysPlayed: 0,
        bestTotalScore: 0,
        bestMaxScore: 0,
        averageScore: 0,
        totalWordsFound: 0,
        bestDay: '',
      };
    }

    const bestTotalScore = Math.max(...validResults.map(r => r.totalScore));
    const bestMaxScore = Math.max(...validResults.map(r => r.maxScore));
    const totalWordsFound = validResults.reduce(
      (sum, r) => sum + r.wordCount,
      0
    );
    const averageScore =
      validResults.reduce((sum, r) => sum + r.totalScore, 0) /
      validResults.length;

    const bestDayResult = validResults.find(
      r => r.totalScore === bestTotalScore
    );
    const bestDay = bestDayResult ? bestDayResult.day : '';

    return {
      totalDaysPlayed: validResults.length,
      bestTotalScore: bestTotalScore || 0,
      bestMaxScore: bestMaxScore || 0,
      averageScore: Math.round(averageScore) || 0,
      totalWordsFound: totalWordsFound || 0,
      bestDay: bestDay || '',
    };
  } catch (error) {
    console.warn('Failed to get historical stats:', error);
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
