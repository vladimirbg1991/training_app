/**
 * PowerSync integration barrel export.
 *
 * Usage:
 *   import { PowerSyncProvider } from '@/lib/powersync';
 *   import { type ExerciseRow, type RoutineRow } from '@/lib/powersync';
 *   import { useExercises, useWorkoutSets } from '@/lib/powersync';
 */

export { PowerSyncProvider } from './provider';
export { SupabasePowerSyncConnector } from './connector';
export { powersyncSchema } from './schema';
export {
  // Exercises
  useExercises,
  useExercise,
  useExercisesByTargetMuscle,
  useExercisesByBodyPart,
  useExercisesByBodyParts,
  useExercisesByEquipment,
  // Equipment
  useEquipment,
  useEquipmentById,
  // Routines
  useRoutines,
  useRoutine,
  // Workout Sessions
  useWorkoutSessions,
  useActiveSession,
  useWorkoutSession,
  // Workout Sets
  useWorkoutSets,
  useExerciseHistory,
  usePersonalRecords,
  // Set Groups (Patch 8)
  useSetGroups,
  // User Exercise Preferences (Patch 8)
  useExercisePreference,
  useExercisePreferences,
  // Gym Equipment (Patch 8)
  useGymEquipmentInstances,
  // Exercise Substitutions (Patch 8)
  useExerciseSubstitutions,
  // User
  useUserProfile,
} from './hooks';

// Row types for PowerSync SQLite data
export type {
  ExerciseRow,
  EquipmentRow,
  RoutineRow,
  WorkoutSessionRow,
  WorkoutSetRow,
  UserRow,
} from './row-types';
