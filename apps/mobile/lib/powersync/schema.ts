/**
 * PowerSync client-side schema.
 *
 * Defines the local SQLite tables that PowerSync manages on the device.
 * This is separate from the Drizzle/Postgres schema in packages/sync — it
 * mirrors the same tables but uses SQLite-compatible types.
 *
 * Type mapping:
 *   Postgres text/uuid   -> column.text
 *   Postgres boolean      -> column.integer (0/1 — SQLite has no boolean)
 *   Postgres integer      -> column.integer
 *   Postgres real         -> column.real
 *   Postgres timestamptz  -> column.text (ISO 8601 string)
 *   Postgres jsonb        -> column.text (JSON string)
 *
 * The `id` column is implicit — PowerSync uses the row's UUID as the PK.
 *
 * Keep in sync with:
 *   - supabase/migrations/0001_initial.sql
 *   - supabase/migrations/0002_patch8_smart_logger.sql
 *   - packages/sync/src/schema.ts (Drizzle)
 */

import { column, Schema, Table } from '@powersync/react-native';

// ============================================================================
// users
// ============================================================================

const users = new Table({
  user_type: column.text,
  display_name: column.text,
  default_unit: column.text,
  default_rest_seconds: column.integer,
  onboarding_completed: column.integer, // boolean -> 0/1
  current_bodyweight_value: column.real,
  current_bodyweight_unit: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// equipment
// ============================================================================

const equipment = new Table({
  name: column.text,
  category: column.text,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// exercises
// ============================================================================

const exercises = new Table({
  name: column.text,
  instructions: column.text,
  body_part: column.text,
  target_muscle: column.text,
  secondary_muscles: column.text, // jsonb -> JSON string
  equipment_id: column.text,
  is_custom: column.integer, // boolean -> 0/1
  created_by: column.text,
  external_id: column.text,
  gif_url: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// routines
// ============================================================================

const routines = new Table({
  user_id: column.text,
  name: column.text,
  description: column.text,
  exercise_config: column.text, // jsonb -> JSON string
  visibility: column.text,
  is_shareable: column.integer, // boolean -> 0/1
  origin_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// workout_sessions (includes Patch 8 columns)
// ============================================================================

const workout_sessions = new Table({
  user_id: column.text,
  routine_id: column.text,
  name: column.text,
  status: column.text,
  started_at: column.text,
  completed_at: column.text,
  duration_seconds: column.integer,
  notes: column.text,
  external_sync_id: column.text,
  sync_source: column.text,
  // Patch 8 additions
  gym_id: column.text,
  subjective_effort: column.integer,
  entry_source: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// workout_sets (includes Patch 8 columns)
// ============================================================================

const workout_sets = new Table({
  session_id: column.text,
  exercise_id: column.text,
  user_id: column.text,
  set_index: column.integer,
  weight_value: column.real,
  weight_unit: column.text,
  reps: column.integer,
  rpe: column.real,
  rir: column.integer,
  duration_seconds: column.integer,
  distance_value: column.real,
  distance_unit: column.text,
  bodyweight_at_time: column.real,
  bodyweight_unit: column.text,
  is_warmup: column.integer, // boolean -> 0/1
  is_personal_record: column.integer, // boolean -> 0/1
  notes: column.text,
  external_sync_id: column.text,
  sync_source: column.text,
  performed_at: column.text,
  // Patch 8 additions
  set_group_id: column.text,
  set_group_position: column.integer,
  gym_equipment_instance_id: column.text,
  pin_position: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// set_groups (Patch 8 — supersets, drop sets, circuits)
// ============================================================================

const set_groups = new Table({
  session_id: column.text,
  user_id: column.text,
  kind: column.text, // superset | drop_set | giant_set | circuit
  rounds: column.integer,
  rest_seconds: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// gym_equipment_instances (Patch 8 — specific machines at gyms)
// ============================================================================

const gym_equipment_instances = new Table({
  gym_id: column.text,
  equipment_id: column.text,
  exercise_id: column.text,
  display_label: column.text,
  pin_to_kg: column.text, // jsonb -> JSON string
  status: column.text, // operational | maintenance | out_of_service
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// user_exercise_preferences (Patch 8 — per-user increment overrides)
// ============================================================================

const user_exercise_preferences = new Table({
  user_id: column.text,
  exercise_id: column.text,
  default_weight_increment: column.real,
  default_increment_unit: column.text,
  default_reps_increment: column.integer,
  default_rest_seconds: column.integer,
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// exercise_substitutions (Patch 8 — swap suggestions for pre-flight)
// ============================================================================

const exercise_substitutions = new Table({
  exercise_id: column.text,
  substitute_id: column.text,
  similarity_score: column.real,
  reason_label: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// ============================================================================
// Export combined schema — all 10 tables
// ============================================================================

export const powersyncSchema = new Schema({
  users,
  equipment,
  exercises,
  routines,
  workout_sessions,
  workout_sets,
  set_groups,
  gym_equipment_instances,
  user_exercise_preferences,
  exercise_substitutions,
});
