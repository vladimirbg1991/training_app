import { z } from 'zod';

// ============================================================================
// Weight and distance units — the foundation of the unit system.
// Every weight/distance value in the app carries its unit. Never a bare number.
// ============================================================================

export const WeightUnitSchema = z.enum(['kg', 'lb']);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

export const DistanceUnitSchema = z.enum(['km', 'mi', 'm']);
export type DistanceUnit = z.infer<typeof DistanceUnitSchema>;

export const WeightSchema = z.object({
  value: z.number(),
  unit: WeightUnitSchema,
});
export type Weight = z.infer<typeof WeightSchema>;

export const DistanceSchema = z.object({
  value: z.number(),
  unit: DistanceUnitSchema,
});
export type Distance = z.infer<typeof DistanceSchema>;

// Default unit preferences
export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'kg';
export const DEFAULT_DISTANCE_UNIT: DistanceUnit = 'km';
