import { estimateOneRepMax } from './one-rep-max.js';
import { normalizeToKg } from './unit-conversion.js';

interface HistoricalSet {
  weight_value: number | null;
  weight_unit: string | null;
  bodyweight_at_time?: number | null;
  bodyweight_unit?: string | null;
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
    bodyweightAtTime?: number | null;
    bodyweightUnit?: string | null;
    reps: number | null;
    pinPosition: number | null;
    isWarmup: boolean;
  },
  history: HistoricalSet[],
  exerciseName: string,
): PRResult[] {
  const effectiveWeight = newSet.weightValue ?? newSet.bodyweightAtTime ?? null;
  if (newSet.isWarmup || !effectiveWeight || !newSet.reps) return [];
  const effectiveUnit = newSet.weightValue != null ? newSet.weightUnit : (newSet.bodyweightUnit ?? 'kg');

  const workingSets = history.filter(
    (h) => h.is_warmup === 0 && (h.weight_value || h.bodyweight_at_time) && h.reps,
  );

  // First-ever working set is always a PR
  if (workingSets.length === 0) {
    const prs: PRResult[] = [];
    if (effectiveWeight > 0) {
      prs.push({
        type: 'weight',
        value: effectiveWeight,
        previousValue: null,
        description: `First ${exerciseName} PR: ${effectiveWeight} ${effectiveUnit}`,
      });
    }
    return prs;
  }

  const newWeightKg = normalizeToKg(effectiveWeight, effectiveUnit as 'kg' | 'lb');
  const prs: PRResult[] = [];

  // Weight PR: heaviest weight lifted at any rep count (normalized to kg)
  const maxHistoricalWeightKg = Math.max(
    ...workingSets.map((h) => {
      const hw = h.weight_value ?? h.bodyweight_at_time ?? 0;
      const hu = (h.weight_value != null ? h.weight_unit : h.bodyweight_unit) ?? 'kg';
      return normalizeToKg(hw, hu as 'kg' | 'lb');
    }),
  );
  if (newWeightKg > maxHistoricalWeightKg) {
    prs.push({
      type: 'weight',
      value: effectiveWeight,
      previousValue: maxHistoricalWeightKg,
      description: `New weight PR: ${effectiveWeight} ${effectiveUnit} on ${exerciseName}`,
    });
  }

  // Reps PR: most reps at the same or higher weight (normalized to kg)
  const setsAtSameOrHigherWeight = workingSets.filter((h) => {
    const hw = h.weight_value ?? h.bodyweight_at_time ?? 0;
    const hu = (h.weight_value != null ? h.weight_unit : h.bodyweight_unit) ?? 'kg';
    return normalizeToKg(hw, hu as 'kg' | 'lb') >= newWeightKg;
  });
  if (setsAtSameOrHigherWeight.length > 0) {
    const maxRepsAtWeight = Math.max(
      ...setsAtSameOrHigherWeight.map((h) => h.reps!),
    );
    if (newSet.reps > maxRepsAtWeight) {
      prs.push({
        type: 'reps',
        value: newSet.reps,
        previousValue: maxRepsAtWeight,
        description: `New reps PR: ${effectiveWeight} ${effectiveUnit} × ${newSet.reps} on ${exerciseName}`,
      });
    }
  }

  // Estimated 1RM PR (always compare in kg for consistency)
  const newE1RM = estimateOneRepMax(newWeightKg, newSet.reps);
  const maxHistoricalE1RM = Math.max(
    ...workingSets.map((h) => {
      const hw = h.weight_value ?? h.bodyweight_at_time ?? 0;
      const hu = (h.weight_value != null ? h.weight_unit : h.bodyweight_unit) ?? 'kg';
      return estimateOneRepMax(normalizeToKg(hw, hu as 'kg' | 'lb'), h.reps!);
    }),
  );
  if (newE1RM > maxHistoricalE1RM) {
    // Display the e1rm in the user's original unit for the description
    const displayE1RM = estimateOneRepMax(effectiveWeight, newSet.reps);
    prs.push({
      type: 'estimated_1rm',
      value: Math.round(newE1RM * 10) / 10,
      previousValue: Math.round(maxHistoricalE1RM * 10) / 10,
      description: `New est. 1RM: ${Math.round(displayE1RM)} ${effectiveUnit} on ${exerciseName}`,
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
  draftBodyweightAtTime?: number | null,
  draftBodyweightUnit?: string | null,
): boolean {
  const effectiveWeight = draftWeight ?? draftBodyweightAtTime ?? null;
  if (!effectiveWeight || !draftReps) return false;
  const effectiveUnit = draftWeight != null ? draftWeightUnit : (draftBodyweightUnit ?? 'kg');

  const workingSets = history.filter(
    (h) => h.is_warmup === 0 && (h.weight_value || h.bodyweight_at_time) && h.reps,
  );
  if (workingSets.length === 0) return true; // First-ever set is always PR pace

  const newE1RM = estimateOneRepMax(normalizeToKg(effectiveWeight, effectiveUnit as 'kg' | 'lb'), draftReps);
  const maxE1RM = Math.max(
    ...workingSets.map((h) => {
      const hw = h.weight_value ?? h.bodyweight_at_time ?? 0;
      const hu = (h.weight_value != null ? h.weight_unit : h.bodyweight_unit) ?? 'kg';
      return estimateOneRepMax(normalizeToKg(hw, hu as 'kg' | 'lb'), h.reps!);
    }),
  );
  return newE1RM > maxE1RM;
}
