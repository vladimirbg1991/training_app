/**
 * TypeScript interfaces for PowerSync SQLite row shapes.
 *
 * These mirror the PowerSync client-side schema (schema.ts) with TypeScript types.
 * Use these instead of inline interfaces in screen files to prevent drift.
 *
 * Note: SQLite has no boolean type — booleans are stored as 0/1 integers.
 * Note: timestamps are stored as ISO 8601 strings.
 * Note: JSONB columns are stored as JSON text strings.
 */

export interface ExerciseRow {
  id: string;
  name: string;
  instructions: string | null;
  body_part: string | null;
  target_muscle: string | null;
  secondary_muscles: string | null; // JSON string of string[]
  equipment_id: string | null;
  is_custom: number; // 0 | 1
  created_by: string | null;
  external_id: string | null;
  gif_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentRow {
  id: string;
  name: string;
  category: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoutineRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exercise_config: string | null; // JSON string of RoutineExerciseConfig[]
  visibility: string;
  is_shareable: number; // 0 | 1
  origin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSessionRow {
  id: string;
  user_id: string;
  routine_id: string | null;
  name: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  external_sync_id: string | null;
  sync_source: string;
  gym_id: string | null;
  subjective_effort: number | null;
  entry_source: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutSetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  user_id: string;
  set_index: number;
  weight_value: number | null;
  weight_unit: string;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  duration_seconds: number | null;
  distance_value: number | null;
  distance_unit: string | null;
  bodyweight_at_time: number | null;
  bodyweight_unit: string | null;
  is_warmup: number; // 0 | 1
  is_personal_record: number; // 0 | 1
  notes: string | null;
  external_sync_id: string | null;
  sync_source: string;
  performed_at: string;
  set_group_id: string | null;
  set_group_position: number | null;
  gym_equipment_instance_id: string | null;
  pin_position: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  user_type: string;
  display_name: string | null;
  default_unit: string;
  default_rest_seconds: number;
  onboarding_completed: number; // 0 | 1
  current_bodyweight_value: number | null;
  current_bodyweight_unit: string | null;
  created_at: string;
  updated_at: string;
}
