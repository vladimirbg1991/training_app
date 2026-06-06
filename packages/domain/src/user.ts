import { z } from 'zod';
import { WeightUnitSchema } from './units';

// ============================================================================
// User types and preferences
// ============================================================================

export const UserTypeSchema = z.enum(['lifter', 'trainer', 'gym']);
export type UserType = z.infer<typeof UserTypeSchema>;

// Base object shape. Keep this as a ZodObject so `.pick`/`.omit`/`.extend`
// remain available — those methods do NOT exist on the ZodEffects returned
// by `.refine()`, which is why UserSchema itself cannot be picked from.
const UserShape = z.object({
  id: z.string(), // Clerk sub claim
  userType: UserTypeSchema,
  displayName: z.string().nullable(),
  defaultUnit: WeightUnitSchema.default('kg'),
  defaultRestSeconds: z.number().int().positive().default(90),
  onboardingCompleted: z.boolean().default(false),
  currentBodyweightValue: z.number().positive().nullable(),
  currentBodyweightUnit: WeightUnitSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserSchema = UserShape.refine(
  (user) => {
    // Bodyweight value and unit must be both present or both absent
    const hasValue = user.currentBodyweightValue !== null;
    const hasUnit = user.currentBodyweightUnit !== null;
    return hasValue === hasUnit;
  },
  { message: 'currentBodyweightValue and currentBodyweightUnit must both be present or both absent' },
);
export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserShape.pick({
  id: true,
  userType: true,
  displayName: true,
  defaultUnit: true,
});
export type CreateUser = z.infer<typeof CreateUserSchema>;
