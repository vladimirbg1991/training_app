/** Epley formula: weight × (1 + reps / 30). Standard for strength training apps. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight; // actual 1RM
  return weight * (1 + reps / 30);
}

/** Brzycki formula: weight × 36 / (37 - reps). More conservative for higher rep ranges. */
export function estimateOneRepMaxBrzycki(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0 || reps >= 37) return 0;
  if (reps === 1) return weight;
  return (weight * 36) / (37 - reps);
}

/** Round to nearest 0.5 for display purposes. */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
