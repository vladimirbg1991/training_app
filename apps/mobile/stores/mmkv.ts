/**
 * MMKV persistence layer for the active workout snapshot.
 *
 * MMKV is ~30x faster than AsyncStorage and writes synchronously,
 * making it the right choice for the "never lose a set" guarantee.
 * Every state change in the workout store fires a subscription that
 * calls saveSnapshot() — so even if the app is killed mid-set, the
 * snapshot survives and restoreFromSnapshot() can recover it.
 *
 * This instance is separate from auth storage (which uses SecureStore).
 * MMKV stores data in an unencrypted memory-mapped file — appropriate
 * for workout state but NOT for tokens or credentials.
 */

import { MMKV } from 'react-native-mmkv';

import type {
  WorkoutExercise,
  ConfirmedSet,
  DraftSet,
  DiscardedDraft,
  RestTimerState,
} from './workout-store';

// ---------------------------------------------------------------------------
// MMKV instance — dedicated to workout state
// ---------------------------------------------------------------------------

/** Dedicated MMKV instance for workout state. Separate from auth (SecureStore). */
export const workoutStorage = new MMKV({ id: 'pulse-workout' });

// ---------------------------------------------------------------------------
// Snapshot schema
// ---------------------------------------------------------------------------

const SNAPSHOT_KEY = 'workout_snapshot';
const SNAPSHOT_VERSION = 1;

export interface WorkoutSnapshot {
  version: number;
  timestamp: number;
  sessionId: string;
  startedAt: number;
  routineId: string | null;
  gymId: string | null;
  status: 'active' | 'completing';
  exercises: WorkoutExercise[];
  currentExerciseIndex: number;
  confirmedSets: Record<string, ConfirmedSet[]>;
  draft: DraftSet | null;
  discardedDrafts: DiscardedDraft[];
  restTimer: RestTimerState;
}

// ---------------------------------------------------------------------------
// Snapshot read/write/clear
// ---------------------------------------------------------------------------

/**
 * Persist the current workout state to MMKV.
 * Called on every state change via the Zustand subscription.
 * Writes are synchronous — MMKV uses memory-mapped I/O.
 */
export function saveSnapshot(state: WorkoutSnapshot): void {
  workoutStorage.set(SNAPSHOT_KEY, JSON.stringify(state));
}

/**
 * Load the most recent workout snapshot from MMKV.
 * Returns null if no snapshot exists, the JSON is corrupted,
 * or the snapshot version does not match the current version
 * (forward-incompatible change — safer to discard than crash).
 */
export function loadSnapshot(): WorkoutSnapshot | null {
  const raw = workoutStorage.getString(SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // Shape validation — corrupt snapshots must not crash the app
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.startedAt !== 'number' ||
      !Array.isArray(parsed.exercises)
    ) {
      return null;
    }

    const snapshot = parsed as WorkoutSnapshot;
    if (snapshot.version !== SNAPSHOT_VERSION) return null;
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * Remove the snapshot from MMKV.
 * Called when a workout completes, is abandoned, or when
 * restoreFromSnapshot() detects an invalid session.
 */
export function clearSnapshot(): void {
  workoutStorage.delete(SNAPSHOT_KEY);
}
