import { estimateOneRepMax } from './one-rep-max.js';

const KG_PER_LB = 0.45359237;

function toKg(value: number, unit: string | null): number {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

interface HistoricalSet {
  weight_value: number | null;
  weight_unit: string | null;
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
    weightUnit: string;
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

  // First-ever working set is always a PR
  if (workingSets.length === 0) {
    const prs: PRResult[] = [];
    if (newSet.weightValue > 0) {
      prs.push({
        type: 'weight',
        value: newSet.weightValue,
        previousValue: null,
        description: `First ${exerciseName} PR: ${newSet.weightValue} ${newSet.weightUnit}`,
      });
    }
    return prs;
  }

  const newWeightKg = toKg(newSet.weightValue, newSet.weightUnit);
  const prs: PRResult[] = [];

  // Weight PR: heaviest weight lifted at any rep count (normalized to kg)
  const maxHistoricalWeightKg = Math.max(
    ...workingSets.map((h) => toKg(h.weight_value!, h.weight_unit)),
  );
  if (newWeightKg > maxHistoricalWeightKg) {
    prs.push({
      type: 'weight',
      value: newSet.weightValue,
      previousValue: maxHistoricalWeightKg,
      description: `New weight PR: ${newSet.weightValue} ${newSet.weightUnit} on ${exerciseName}`,
    });
  }

  // Reps PR: most reps at the same or higher weight (normalized to kg)
  const setsAtSameOrHigherWeight = workingSets.filter(
    (h) => toKg(h.weight_value!, h.weight_unit) >= newWeightKg,
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
        description: `New reps PR: ${newSet.weightValue} ${newSet.weightUnit} × ${newSet.reps} on ${exerciseName}`,
      });
    }
  }

  // Estimated 1RM PR (always compare in kg for consistency)
  const newE1RM = estimateOneRepMax(newWeightKg, newSet.reps);
  const maxHistoricalE1RM = Math.max(
    ...workingSets.map((h) =>
      estimateOneRepMax(toKg(h.weight_value!, h.weight_unit), h.reps!),
    ),
  );
  if (newE1RM > maxHistoricalE1RM) {
    // Display the e1rm in the user's original unit for the description
    const displayE1RM = estimateOneRepMax(newSet.weightValue, newSet.reps);
    prs.push({
      type: 'estimated_1rm',
      value: Math.round(newE1RM * 10) / 10,
      previousValue: Math.round(maxHistoricalE1RM * 10) / 10,
      description: `New est. 1RM: ${Math.round(displayE1RM)} ${newSet.weightUnit} on ${exerciseName}`,
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
  draftWeightUnit: string,
  history: HistoricalSet[],
): boolean {
  if (!draftWeight || !draftReps) return false;
  const workingSets = history.filter(
    (h) => h.is_warmup === 0 && h.weight_value && h.reps,
  );
  if (workingSets.length === 0) return true; // First-ever set is always PR pace

  const newE1RM = estimateOneRepMax(toKg(draftWeight, draftWeightUnit), draftReps);
  const maxE1RM = Math.max(
    ...workingSets.map((h) =>
      estimateOneRepMax(toKg(h.weight_value!, h.weight_unit), h.reps!),
    ),
  );
  return newE1RM > maxE1RM;
}
