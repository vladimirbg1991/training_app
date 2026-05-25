-- ==========================================================================
-- Migration: 0005_fk_cascade_fixes
-- Description: Add proper ON DELETE rules to foreign keys that were missing them.
-- ==========================================================================

-- workout_sets.set_group_id → SET NULL (preserve sets when un-grouping)
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_set_group_id_fkey;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_set_group_id_fkey
  FOREIGN KEY (set_group_id) REFERENCES set_groups(id) ON DELETE SET NULL;

-- workout_sets.gym_equipment_instance_id → SET NULL (preserve history when equipment removed)
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_gym_equipment_instance_id_fkey;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_gym_equipment_instance_id_fkey
  FOREIGN KEY (gym_equipment_instance_id) REFERENCES gym_equipment_instances(id) ON DELETE SET NULL;

-- workout_sessions.routine_id → SET NULL (preserve sessions when routine deleted)
ALTER TABLE workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_routine_id_fkey;
ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_routine_id_fkey
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL;

-- exercises.equipment_id → SET NULL (preserve exercises when equipment removed)
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_equipment_id_fkey;
ALTER TABLE exercises ADD CONSTRAINT exercises_equipment_id_fkey
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;

-- routines.origin_id → SET NULL (preserve clones when original deleted)
ALTER TABLE routines DROP CONSTRAINT IF EXISTS routines_origin_id_fkey;
ALTER TABLE routines ADD CONSTRAINT routines_origin_id_fkey
  FOREIGN KEY (origin_id) REFERENCES routines(id) ON DELETE SET NULL;
