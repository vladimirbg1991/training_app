/**
 * Stores barrel export.
 *
 * Re-exports all stores so components can import from '@/stores':
 *   import { useWorkoutStore } from '@/stores';
 */

export {
  useWorkoutStore,
  workoutStore,
  setWorkoutStoreDatabase,
} from './workout-store';

export type {
  WorkoutExercise,
  ConfirmedSet,
  DraftSet,
  DiscardedDraft,
  RestTimerState,
  WorkoutStatus,
  WorkoutState,
  WorkoutActions,
} from './workout-store';

export {
  workoutStorage,
  saveSnapshot,
  loadSnapshot,
  clearSnapshot,
} from './mmkv';

export type { WorkoutSnapshot } from './mmkv';
