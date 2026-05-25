/** Default weight increments per equipment category (from design spec). */
const EQUIPMENT_INCREMENTS: Record<
  string,
  { value: number; unit: 'kg' | 'lb' | 'pin' }
> = {
  barbell: { value: 2.5, unit: 'kg' },
  dumbbell: { value: 2.5, unit: 'kg' },
  cable: { value: 5, unit: 'kg' },
  machine: { value: 1, unit: 'pin' }, // selectorized default
  bodyweight: { value: 1.25, unit: 'kg' },
  band: { value: 1, unit: 'kg' },
  kettlebell: { value: 4, unit: 'kg' }, // kettlebells jump in ~4kg increments
  plate: { value: 5, unit: 'kg' },
  other: { value: 2.5, unit: 'kg' },
};

const DEFAULT_INCREMENT = { value: 2.5, unit: 'kg' as const };

/**
 * Resolve the weight increment for an exercise.
 * Priority: user preference override > equipment category default > fallback.
 */
export function resolveIncrement(
  equipmentCategory: string | null,
  userOverride?: { value: number; unit: string } | null,
): { value: number; unit: 'kg' | 'lb' | 'pin' } {
  if (userOverride?.value && userOverride?.unit) {
    return {
      value: userOverride.value,
      unit: userOverride.unit as 'kg' | 'lb' | 'pin',
    };
  }
  if (equipmentCategory && equipmentCategory in EQUIPMENT_INCREMENTS) {
    return EQUIPMENT_INCREMENTS[equipmentCategory]!;
  }
  return DEFAULT_INCREMENT;
}

/** Default reps increment (always 1, but overridable per user preference). */
export function resolveRepsIncrement(userOverride?: number | null): number {
  return userOverride ?? 1;
}
