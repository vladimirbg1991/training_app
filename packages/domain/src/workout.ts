import { z } from 'zod';
import { WeightUnitSchema, DistanceUnitSchema } from './units.js';

// ============================================================================
// Workout sessions and sets — the core data model
// ============================================================================

export const SessionStatusSchema = z.enum(['in_progress', 'completed', 'abandoned']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SyncSourceSchema = z.enum(['app', 'healthkit', 'health_connect']);
export type SyncSource = z.infer<typeof SyncSourceSchema>;

/** Emoji effort capture (1=struggle, 2=neutral, 3=strong, 4=fire). Maps to RPE server-side. */
export const SubjectiveEffortSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
]);
export type SubjectiveEffort = z.infer<typeof SubjectiveEffortSchema>;

export const WorkoutSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  routineId: z.string().uuid().nullable(),
  name: z.string().nullable(),
  status: SessionStatusSchema.default('in_progress'),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
  durationSeconds: z.number().int().nullable(),
  notes: z.string().nullable(),
  subjectiveEffort: SubjectiveEffortSchema.nullable().default(null),
  externalSyncId: z.string().nullable(),
  syncSource: SyncSourceSchema.default('app'),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;

export const WorkoutSetSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  userId: z.string(),
  setIndex: z.number().int().nonnegative(),
  weightValue: z.number().nullable(),
  weightUnit: WeightUnitSchema.default('kg'),
  reps: z.number().int().positive().nullable(),
  rpe: z.number().min(1).max(10).nullable(),
  rir: z.number().int().nonnegative().nullable(),
  durationSeconds: z.number().int().positive().nullable(),
  distanceValue: z.number().positive().nullable(),
  distanceUnit: DistanceUnitSchema.nullable(),
  bodyweightAtTime: z.number().positive().nullable(),
  bodyweightUnit: WeightUnitSchema.nullable(),
  isWarmup: z.boolean().default(false),
  isPersonalRecord: z.boolean().default(false),
  notes: z.string().nullable(),
  externalSyncId: z.string().nullable(),
  syncSource: SyncSourceSchema.default('app'),
  performedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine(
  (set) => {
    // Bodyweight value and unit must be both present or both absent
    const hasValue = set.bodyweightAtTime !== null;
    const hasUnit = set.bodyweightUnit !== null;
    return hasValue === hasUnit;
  },
  { message: 'bodyweightAtTime and bodyweightUnit must both be present or both absent' },
);
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;

/** Schema for logging a set from the UI (minimal required fields). */
export const LogSetSchema = z.object({
  exerciseId: z.string().uuid(),
  setIndex: z.number().int().nonnegative(),
  weightValue: z.number().nullable().default(null),
  weightUnit: WeightUnitSchema.default('kg'),
  reps: z.number().int().positive().nullable().default(null),
  rpe: z.number().min(1).max(10).nullable().default(null),
  isWarmup: z.boolean().default(false),
  bodyweightAtTime: z.number().positive().nullable().default(null),
  bodyweightUnit: WeightUnitSchema.nullable().default(null),
  notes: z.string().nullable().default(null),
}).refine(
  (set) => {
    // At least one measurement must be provided (weight, reps, duration, or distance)
    return set.weightValue !== null || set.reps !== null;
  },
  { message: 'At least weightValue or reps must be provided' },
).refine(
  (set) => {
    // Bodyweight value and unit must be both present or both absent
    const hasValue = set.bodyweightAtTime !== null;
    const hasUnit = set.bodyweightUnit !== null;
    return hasValue === hasUnit;
  },
  { message: 'bodyweightAtTime and bodyweightUnit must both be present or both absent' },
);
export type LogSet = z.infer<typeof LogSetSchema>;

// ============================================================================
// Set groups — supersets, drop sets, circuits
// DEFERRED: No backing SQL table or Drizzle schema exists yet.
// These types are schema-ready for Migration 0002 (Patch 8).
// Do NOT attempt to persist SetGroup objects until the table is created.
// ============================================================================

export const SetGroupKindSchema = z.enum(['superset', 'drop_set', 'giant_set', 'circuit']);
export type SetGroupKind = z.infer<typeof SetGroupKindSchema>;

export const SetGroupSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  kind: SetGroupKindSchema,
  rounds: z.number().int().positive().nullable(),
  restSeconds: z.number().int().positive().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SetGroup = z.infer<typeof SetGroupSchema>;
