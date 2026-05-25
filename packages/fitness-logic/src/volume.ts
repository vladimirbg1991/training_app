interface SetData {
  weightValue: number | null;
  reps: number | null;
  isWarmup: boolean;
}

/** Calculate volume for a single set: weight × reps. Warmup sets excluded. */
export function setVolume(set: SetData): number {
  if (set.isWarmup || !set.weightValue || !set.reps) return 0;
  return set.weightValue * set.reps;
}

/** Total volume across multiple sets. */
export function totalVolume(sets: SetData[]): number {
  return sets.reduce((sum, set) => sum + setVolume(set), 0);
}

/** Count of working sets (non-warmup). */
export function workingSetCount(sets: SetData[]): number {
  return sets.filter((s) => !s.isWarmup).length;
}

/** Average RPE across sets that have RPE recorded. */
export function averageRPE(sets: Array<{ rpe: number | null }>): number | null {
  const withRpe = sets.filter((s) => s.rpe !== null);
  if (withRpe.length === 0) return null;
  return withRpe.reduce((sum, s) => sum + s.rpe!, 0) / withRpe.length;
}

/** Format volume for display: "8,420 kg" with thousands separator. */
export function formatVolume(volume: number, unit: string = 'kg'): string {
  return `${volume.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${unit}`;
}

/** Format duration from seconds to "52 min" or "1h 12min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
}
