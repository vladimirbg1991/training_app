/** Epley formula: weight × (1 + reps / 30). Standard for strength training apps. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight; // actual 1RM
  // Cap at 12 reps — Epley overestimates beyond this
  const effectiveReps = Math.min(reps, 12);
  return weight * (1 + effectiveReps / 30);
}

/** Brzycki formula: weight × 36 / (37 - reps). More conservative for higher rep ranges. */
export function estimateOneRepMaxBrzycki(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0 || reps >= 37) return 0;
  if (reps === 1) return weight;
  // Cap at 12 reps — Brzycki becomes unreliable beyond this
  const effectiveReps = Math.min(reps, 12);
  return (weight * 36) / (37 - effectiveReps);
}

/** Round to nearest 0.5 for display purposes. */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
