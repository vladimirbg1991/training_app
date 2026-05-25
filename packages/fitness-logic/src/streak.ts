/**
 * Streak computation for training consistency tracking.
 *
 * A "streak" counts consecutive TRAINING days, not consecutive calendar days.
 * If the user trains Mon/Wed/Fri, that is a 3-day streak even though there
 * are rest days between. The streak breaks when there are zero training days
 * for a configurable gap threshold (default: 3 calendar days without training).
 */

/** Default maximum gap between training days before the streak breaks. */
const DEFAULT_MAX_GAP_DAYS = 3;

/**
 * Compute the current training streak from a list of workout dates.
 *
 * @param workoutDates — Array of date strings (YYYY-MM-DD or ISO 8601) when
 *   the user completed a workout. Does NOT need to be sorted — the function
 *   sorts internally. Duplicate dates are collapsed.
 * @param maxGapDays — Maximum number of calendar days between training days
 *   before the streak is considered broken. Default: 2 (allows rest days).
 * @returns Object with `current` (active streak count) and `best` (all-time best).
 */
export function computeStreak(
  workoutDates: string[],
  maxGapDays: number = DEFAULT_MAX_GAP_DAYS,
): { current: number; best: number } {
  if (workoutDates.length === 0) return { current: 0, best: 0 };

  // Normalize to YYYY-MM-DD and deduplicate
  const uniqueDays = [
    ...new Set(
      workoutDates.map((d) => {
        const date = new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }),
    ),
  ].sort();

  if (uniqueDays.length === 0) return { current: 0, best: 0 };

  // Build streaks by walking forward through sorted dates
  const streaks: number[] = [];
  let currentStreak = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]!);
    const curr = new Date(uniqueDays[i]!);
    const gapDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (gapDays <= maxGapDays) {
      currentStreak += 1;
    } else {
      streaks.push(currentStreak);
      currentStreak = 1;
    }
  }
  streaks.push(currentStreak);

  const best = Math.max(...streaks);

  // Check if the current streak is still active (last workout within maxGapDays of today)
  const lastWorkoutDate = new Date(uniqueDays[uniqueDays.length - 1]!);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastWorkoutDate.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.round((today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));

  const current = daysSinceLast <= maxGapDays ? streaks[streaks.length - 1]! : 0;

  return { current, best };
}

/**
 * Get the total number of training days in a date range.
 */
export function trainingDaysInRange(
  workoutDates: string[],
  startDate: Date,
  endDate: Date,
): number {
  const start = startDate.getTime();
  const end = endDate.getTime();

  const uniqueDays = new Set(
    workoutDates
      .map((d) => new Date(d))
      .filter((d) => d.getTime() >= start && d.getTime() <= end)
      .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`),
  );

  return uniqueDays.size;
}
