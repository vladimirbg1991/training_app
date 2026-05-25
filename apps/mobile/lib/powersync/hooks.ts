/**
 * Typed PowerSync query hooks for the Pulse fitness app.
 *
 * Each hook uses PowerSync's useQuery() which returns live-updating results
 * from local SQLite — NOT from the network. This is the local-first read
 * path mandated by CLAUDE.md ("UI components do not call fetch").
 *
 * All queries run against the device's SQLite database. PowerSync
 * automatically re-executes them when the underlying data changes
 * (local writes or incoming sync).
 */

import { useQuery } from '@powersync/react-native';

// ============================================================================
// Exercises
// ============================================================================

/** List all exercises, optionally filtered by search and/or body parts. */
export function useExercises(searchQuery?: string) {
  const sql = searchQuery
    ? `SELECT * FROM exercises WHERE name LIKE ? ORDER BY name ASC`
    : `SELECT * FROM exercises ORDER BY name ASC`;

  const params = searchQuery ? [`%${searchQuery}%`] : [];
  return useQuery(sql, params);
}

/**
 * Get a single exercise by ID.
 * Handles undefined ID safely (returns empty result set).
 */
export function useExercise(id: string | undefined) {
  return useQuery(
    id ? `SELECT * FROM exercises WHERE id = ? LIMIT 1` : `SELECT 1 WHERE 0`,
    id ? [id] : [],
  );
}

/** List exercises filtered by target muscle group. */
export function useExercisesByTargetMuscle(targetMuscle: string) {
  return useQuery(
    `SELECT * FROM exercises WHERE target_muscle = ? ORDER BY name ASC`,
    [targetMuscle],
  );
}

/** List exercises filtered by body part (e.g., 'upper legs', 'chest'). */
export function useExercisesByBodyPart(bodyPart: string) {
  return useQuery(
    `SELECT * FROM exercises WHERE body_part = ? ORDER BY name ASC`,
    [bodyPart],
  );
}

/** List exercises matching any of the given body parts. */
export function useExercisesByBodyParts(bodyParts: string[]) {
  if (bodyParts.length === 0) {
    return useQuery(`SELECT * FROM exercises ORDER BY name ASC`);
  }
  const placeholders = bodyParts.map(() => '?').join(', ');
  return useQuery(
    `SELECT * FROM exercises WHERE body_part IN (${placeholders}) ORDER BY name ASC`,
    bodyParts,
  );
}

/** List exercises filtered by equipment ID. */
export function useExercisesByEquipment(equipmentId: string) {
  return useQuery(
    `SELECT * FROM exercises WHERE equipment_id = ? ORDER BY name ASC`,
    [equipmentId],
  );
}

// ============================================================================
// Equipment
// ============================================================================

/** List all equipment, ordered by sort_order. */
export function useEquipment() {
  return useQuery(`SELECT * FROM equipment ORDER BY sort_order ASC`);
}

/** Get a single equipment item by ID. */
export function useEquipmentById(id: string | undefined) {
  return useQuery(
    id ? `SELECT * FROM equipment WHERE id = ? LIMIT 1` : `SELECT 1 WHERE 0`,
    id ? [id] : [],
  );
}

// ============================================================================
// Routines
// ============================================================================

/** List all routines for the current user, newest first. */
export function useRoutines(userId: string) {
  return useQuery(
    `SELECT * FROM routines WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId],
  );
}

/** Get a single routine by ID. */
export function useRoutine(id: string | undefined) {
  return useQuery(
    id ? `SELECT * FROM routines WHERE id = ? LIMIT 1` : `SELECT 1 WHERE 0`,
    id ? [id] : [],
  );
}

// ============================================================================
// Workout Sessions
// ============================================================================

/** List all workout sessions for a user, newest first. */
export function useWorkoutSessions(userId: string) {
  return useQuery(
    `SELECT * FROM workout_sessions WHERE user_id = ? ORDER BY started_at DESC`,
    [userId],
  );
}

/** Get the currently in-progress session (if any). */
export function useActiveSession(userId: string) {
  return useQuery(
    `SELECT * FROM workout_sessions WHERE user_id = ? AND status = 'in_progress' LIMIT 1`,
    [userId],
  );
}

/** Get a single workout session by ID. */
export function useWorkoutSession(id: string | undefined) {
  return useQuery(
    id ? `SELECT * FROM workout_sessions WHERE id = ? LIMIT 1` : `SELECT 1 WHERE 0`,
    id ? [id] : [],
  );
}

// ============================================================================
// Workout Sets
// ============================================================================

/** List all sets for a specific session, ordered by set index. */
export function useWorkoutSets(sessionId: string) {
  return useQuery(
    `SELECT * FROM workout_sets WHERE session_id = ? ORDER BY set_index ASC`,
    [sessionId],
  );
}

/** Get exercise history: all sets for a specific exercise by a user, newest first. */
export function useExerciseHistory(userId: string, exerciseId: string) {
  return useQuery(
    `SELECT ws.*, s.started_at AS session_started_at
     FROM workout_sets ws
     JOIN workout_sessions s ON ws.session_id = s.id
     WHERE ws.user_id = ? AND ws.exercise_id = ?
     ORDER BY ws.performed_at DESC`,
    [userId, exerciseId],
  );
}

/** Get personal records for a specific exercise. */
export function usePersonalRecords(userId: string, exerciseId: string) {
  return useQuery(
    `SELECT * FROM workout_sets
     WHERE user_id = ? AND exercise_id = ? AND is_personal_record = 1
     ORDER BY performed_at DESC`,
    [userId, exerciseId],
  );
}

// ============================================================================
// Set Groups (Patch 8)
// ============================================================================

/** List all set groups for a specific session. */
export function useSetGroups(sessionId: string) {
  return useQuery(
    `SELECT * FROM set_groups WHERE session_id = ? ORDER BY created_at ASC`,
    [sessionId],
  );
}

// ============================================================================
// User Exercise Preferences (Patch 8)
// ============================================================================

/** Get the user's preference overrides for a specific exercise. */
export function useExercisePreference(userId: string, exerciseId: string) {
  return useQuery(
    `SELECT * FROM user_exercise_preferences WHERE user_id = ? AND exercise_id = ? LIMIT 1`,
    [userId, exerciseId],
  );
}

/** Get all exercise preferences for a user. */
export function useExercisePreferences(userId: string) {
  return useQuery(
    `SELECT * FROM user_exercise_preferences WHERE user_id = ?`,
    [userId],
  );
}

// ============================================================================
// Gym Equipment Instances (Patch 8)
// ============================================================================

/** List all equipment instances at a specific gym. */
export function useGymEquipmentInstances(gymId: string) {
  return useQuery(
    `SELECT * FROM gym_equipment_instances WHERE gym_id = ? ORDER BY display_label ASC`,
    [gymId],
  );
}

// ============================================================================
// Exercise Substitutions (Patch 8)
// ============================================================================

/** Get substitution suggestions for a specific exercise. */
export function useExerciseSubstitutions(exerciseId: string) {
  return useQuery(
    `SELECT es.*, e.name AS substitute_name, e.body_part, e.target_muscle
     FROM exercise_substitutions es
     JOIN exercises e ON es.substitute_id = e.id
     WHERE es.exercise_id = ?
     ORDER BY es.similarity_score DESC`,
    [exerciseId],
  );
}

// ============================================================================
// User
// ============================================================================

/** Get the current user's profile row. */
export function useUserProfile(userId: string) {
  return useQuery(`SELECT * FROM users WHERE id = ? LIMIT 1`, [userId]);
}
