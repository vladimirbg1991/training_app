import { z } from 'zod';
import { WeightUnitSchema } from './units.js';

// ============================================================================
// Routines — user-created workout templates
// ============================================================================

export const VisibilitySchema = z.enum([
  'private', 'trainer_visible', 'gym_visible', 'friends_visible', 'public',
]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const RoutineExerciseConfigSchema = z.object({
  exerciseId: z.string().uuid(),
  targetSets: z.number().int().positive(),
  targetReps: z.number().int().positive(),
  targetWeightValue: z.number().nullable().default(null),
  targetWeightUnit: WeightUnitSchema.nullable().default(null),
  restSeconds: z.number().int().nonnegative().default(90), // 0 is valid (supersets, circuits)
  supersetGroupId: z.string().uuid().nullable().default(null),
  notes: z.string().default(''),
});
export type RoutineExerciseConfig = z.infer<typeof RoutineExerciseConfigSchema>;

export const RoutineSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1),
  description: z.string().nullable(),
  exerciseConfig: z.array(RoutineExerciseConfigSchema).default([]),
  visibility: VisibilitySchema.default('private'),
  isShareable: z.boolean().default(false),
  originId: z.string().uuid().nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Routine = z.infer<typeof RoutineSchema>;

export const CreateRoutineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().default(null),
  exerciseConfig: z.array(RoutineExerciseConfigSchema).min(1),
});
export type CreateRoutine = z.infer<typeof CreateRoutineSchema>;
