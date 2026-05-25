import { estimateOneRepMax } from './one-rep-max.js';

interface HistoricalSet {
  weight_value: number | null;
  reps: number | null;
  pin_position: number | null;
  is_warmup: number; // SQLite boolean
}

export interface PRResult {
  type: 'weight' | 'reps' | 'estimated_1rm';
  value: number;
  previousValue: number | null;
  description: string;
}

/**
 * Detect personal records by comparing a new set against historical data.
 * Returns an array of PRs detected (can be multiple types).
 */
export function detectPRs(
  newSet: {
    weightValue: number | null;
    reps: number | null;
    pinPosition: number | null;
    isWarmup: boolean;
  },
  history: HistoricalSet[],
  exerciseName: string,
): PRResult[] {
  if (newSet.isWarmup || !newSet.weightValue || !newSet.reps) return [];

  const workingSets = history.filter(
    (h) => h.is_warmup === 0 && h.weight_value && h.reps,
  );
  if (workingSets.length === 0) return []; // First time doing this exercise, no PRs to detect

  const prs: PRResult[] = [];

  // Weight PR: heaviest weight lifted at any rep count
  const maxHistoricalWeight = Math.max(
    ...workingSets.map((h) => h.weight_value!),
  );
  if (newSet.weightValue > maxHistoricalWeight) {
    prs.push({
      type: 'weight',
      value: newSet.weightValue,
      previousValue: maxHistoricalWeight,
      description: `New weight PR: ${newSet.weightValue} kg on ${exerciseName}`,
    });
  }

  // Reps PR: most reps at the same or higher weight
  const setsAtSameOrHigherWeight = workingSets.filter(
    (h) => h.weight_value! >= newSet.weightValue!,
  );
  if (setsAtSameOrHigherWeight.length > 0) {
    const maxRepsAtWeight = Math.max(
      ...setsAtSameOrHigherWeight.map((h) => h.reps!),
    );
    if (newSet.reps > maxRepsAtWeight) {
      prs.push({
        type: 'reps',
        value: newSet.reps,
        previousValue: maxRepsAtWeight,
        description: `New reps PR: ${newSet.weightValue} × ${newSet.reps} on ${exerciseName}`,
      });
    }
  }

  // Estimated 1RM PR
  const newE1RM = estimateOneRepMax(newSet.weightValue, newSet.reps);
  const maxHistoricalE1RM = Math.max(
    ...workingSets.map((h) => estimateOneRepMax(h.weight_value!, h.reps!)),
  );
  if (newE1RM > maxHistoricalE1RM) {
    prs.push({
      type: 'estimated_1rm',
      value: Math.round(newE1RM * 10) / 10,
      previousValue: Math.round(maxHistoricalE1RM * 10) / 10,
      description: `New est. 1RM: ${Math.round(newE1RM)} kg on ${exerciseName}`,
    });
  }

  return prs;
}

/**
 * Check if the current draft values would be PR pace (before confirming).
 * Used to change the "Log" button to show trophy icon.
 */
export function isPRPace(
  draftWeight: number | null,
  draftReps: number | null,
  history: HistoricalSet[],
): boolean {
  if (!draftWeight || !draftReps) return false;
  const workingSets = history.filter(
    (h) => h.is_warmup === 0 && h.weight_value && h.reps,
  );
  if (workingSets.length === 0) return false;

  const newE1RM = estimateOneRepMax(draftWeight, draftReps);
  const maxE1RM = Math.max(
    ...workingSets.map((h) => estimateOneRepMax(h.weight_value!, h.reps!)),
  );
  return newE1RM > maxE1RM;
}
