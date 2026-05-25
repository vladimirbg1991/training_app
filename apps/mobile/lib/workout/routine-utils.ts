import type { RoutineExerciseConfig } from '@gym-app/domain';

/**
 * Average working time per set in seconds (for time estimation).
 * Includes setup, execution, and brief post-set recovery.
 */
const AVG_SET_SECONDS = 45;

/**
 * Parse the exercise_config JSONB from a routine row.
 * Returns an empty array on any parse failure (corrupted JSON, null, wrong type).
 */
export function parseExerciseConfig(raw: string | null): RoutineExerciseConfig[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RoutineExerciseConfig[]) : [];
  } catch {
    return [];
  }
}

/**
 * Estimate workout duration in minutes from exercise configs.
 * Formula: SUM(targetSets × (avgSetSeconds + restSeconds)) / 60
 */
export function estimateMinutes(configs: RoutineExerciseConfig[]): number {
  let totalSeconds = 0;
  for (const config of configs) {
    const restPerSet = config.restSeconds ?? 90;
    totalSeconds += config.targetSets * (AVG_SET_SECONDS + restPerSet);
  }
  return Math.max(1, Math.round(totalSeconds / 60));
}

/** Total sets across all exercise configs. */
export function totalSetsFromConfig(configs: RoutineExerciseConfig[]): number {
  return configs.reduce((sum, c) => sum + c.targetSets, 0);
}
