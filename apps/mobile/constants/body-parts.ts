import type { MuscleGroup } from '@gym-app/domain';

/**
 * Maps UI muscle-group labels to the body_part values used in the exercise seed data.
 * Shared between the library screen and the exercise selector.
 */
export const BODY_PART_MAP: Record<MuscleGroup, string[]> = {
  chest: ['chest'],
  back: ['back'],
  legs: ['upper legs', 'lower legs'],
  shoulders: ['shoulders'],
  arms: ['upper arms', 'lower arms'],
  core: ['core'],
  full_body: ['full body'],
};
