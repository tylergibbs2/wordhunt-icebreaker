// Scoring algorithm constants and functions
export const SCORING = {
  BASE_SCORES: [0, 0, 0, 25, 75, 200, 350, 550, 800, 1100], // Greater variation between 3-4-5 letter words
  STRESS_BONUS: [10, 10, 0], // Reduced stress bonuses to emphasize word length
  DEPTH_BONUS: [0, 10, 20, 30, 40], // Reduced depth bonuses to emphasize word length
  COMBO_MULTIPLIERS: {
    ALL_RED: 1.5, // Reduced multiplier to emphasize word length
    ALL_SAME: 1.25, // Reduced multiplier to emphasize word length
    MIXED: 1.0,
  },
};

export interface TilePosition {
  row: number;
  col: number;
}

export function calculateScore(
  word: string,
  selectedTiles: TilePosition[],
  stressLevels: number[][],
  replacementCounts: Map<string, number>
): number {
  const length = word.length;
  const baseScore = SCORING.BASE_SCORES[length] || 250;

  let stressBonus = 0;
  let depthBonus = 0;
  const stressTypes = new Set<number>();

  selectedTiles.forEach(tile => {
    const stress = stressLevels[tile.row][tile.col];
    const cellKey = `${tile.row}-${tile.col}`;
    const depth = replacementCounts.get(cellKey) || 0;

    stressBonus += SCORING.STRESS_BONUS[stress];
    depthBonus += SCORING.DEPTH_BONUS[depth] || 100;
    stressTypes.add(stress);
  });

  // Apply combo multiplier
  let multiplier = SCORING.COMBO_MULTIPLIERS.MIXED;
  if (stressTypes.size === 1) {
    const stressType = Array.from(stressTypes)[0];
    multiplier =
      stressType === 0
        ? SCORING.COMBO_MULTIPLIERS.ALL_RED
        : SCORING.COMBO_MULTIPLIERS.ALL_SAME;
  }

  const rawScore = (baseScore + stressBonus + depthBonus) * multiplier;

  // Round to nearest multiple of 25
  return Math.round(rawScore / 25) * 25;
}

// Helper function to get score breakdown for debugging
export function getScoreBreakdown(
  word: string,
  selectedTiles: TilePosition[],
  stressLevels: number[][],
  replacementCounts: Map<string, number>
) {
  const length = word.length;
  const baseScore = SCORING.BASE_SCORES[length] || 250;

  let stressBonus = 0;
  let depthBonus = 0;
  const stressTypes = new Set<number>();
  const tileDetails: Array<{
    stress: number;
    depth: number;
    stressBonus: number;
    depthBonus: number;
  }> = [];

  selectedTiles.forEach(tile => {
    const stress = stressLevels[tile.row][tile.col];
    const cellKey = `${tile.row}-${tile.col}`;
    const depth = replacementCounts.get(cellKey) || 0;

    const tileStressBonus = SCORING.STRESS_BONUS[stress];
    const tileDepthBonus = SCORING.DEPTH_BONUS[depth] || 100;

    stressBonus += tileStressBonus;
    depthBonus += tileDepthBonus;
    stressTypes.add(stress);

    tileDetails.push({
      stress,
      depth,
      stressBonus: tileStressBonus,
      depthBonus: tileDepthBonus,
    });
  });

  // Apply combo multiplier
  let multiplier = SCORING.COMBO_MULTIPLIERS.MIXED;
  let comboType = 'Mixed';
  if (stressTypes.size === 1) {
    const stressType = Array.from(stressTypes)[0];
    if (stressType === 0) {
      multiplier = SCORING.COMBO_MULTIPLIERS.ALL_RED;
      comboType = 'All Red';
    } else {
      multiplier = SCORING.COMBO_MULTIPLIERS.ALL_SAME;
      comboType = 'All Same Stress';
    }
  }

  const rawScore = (baseScore + stressBonus + depthBonus) * multiplier;

  // Round to nearest multiple of 25
  const finalScore = Math.round(rawScore / 25) * 25;
  const roundingMethod = 'rounded to nearest 25';

  return {
    word,
    length,
    baseScore,
    stressBonus,
    depthBonus,
    multiplier,
    comboType,
    rawScore,
    finalScore,
    roundingMethod,
    tileDetails,
  };
}
