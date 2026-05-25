import { z } from 'zod';

// ============================================================================
// Equipment
// ============================================================================

export const EquipmentCategorySchema = z.enum([
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight',
  'band', 'kettlebell', 'plate', 'other',
]);
export type EquipmentCategory = z.infer<typeof EquipmentCategorySchema>;

export const EquipmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  category: EquipmentCategorySchema.nullable(),
  sortOrder: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Equipment = z.infer<typeof EquipmentSchema>;

// ============================================================================
// Exercises — global catalog + user custom
// ============================================================================

export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  instructions: z.string().nullable(),
  bodyPart: z.string().nullable(),
  targetMuscle: z.string().nullable(),
  secondaryMuscles: z.array(z.string()).default([]),
  equipmentId: z.string().uuid().nullable(),
  isCustom: z.boolean().default(false),
  createdBy: z.string().nullable(), // Clerk sub for custom, null for global
  externalId: z.string().nullable(), // ExerciseDB ID
  gifUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const CreateCustomExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  bodyPart: z.string().min(1).nullable(),
  targetMuscle: z.string().min(1).nullable(),
  secondaryMuscles: z.array(z.string()).default([]),
  equipmentId: z.string().uuid().nullable(),
});
export type CreateCustomExercise = z.infer<typeof CreateCustomExerciseSchema>;

// Major muscle groups used in the UI
export const MUSCLE_GROUPS = [
  'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
