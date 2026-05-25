/**
 * Drizzle ORM schema for the Fitness Tracking Platform.
 *
 * Source of truth for TypeScript types derived from the Postgres schema.
 * Mirrors supabase/migrations/0001_initial.sql + 0002_patch8_smart_logger.sql — keep in sync.
 *
 * Conventions:
 *   - UUIDs for all PKs (sync-safe; never auto-increment)
 *   - user_id is TEXT matching Clerk JWT 'sub' claim
 *   - Every user-owned table has user_id + created_at + updated_at
 *   - Indexes on every column referenced in RLS policies
 */

import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// users
// ============================================================================

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk sub claim — TEXT, not UUID
  userType: text('user_type', { enum: ['lifter', 'trainer', 'gym'] }).notNull(),
  displayName: text('display_name'),
  defaultUnit: text('default_unit', { enum: ['kg', 'lb'] }).notNull().default('kg'),
  defaultRestSeconds: integer('default_rest_seconds').notNull().default(90),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  currentBodyweightValue: real('current_bodyweight_value'),
  currentBodyweightUnit: text('current_bodyweight_unit', { enum: ['kg', 'lb'] }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// equipment
// ============================================================================

export const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  category: text('category', {
    enum: [
      'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight',
      'band', 'kettlebell', 'plate', 'other',
    ],
  }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// exercises
// ============================================================================

export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  instructions: text('instructions'),
  bodyPart: text('body_part'),
  targetMuscle: text('target_muscle'),
  secondaryMuscles: jsonb('secondary_muscles').notNull().default(sql`'[]'::jsonb`),
  equipmentId: uuid('equipment_id').references(() => equipment.id),
  isCustom: boolean('is_custom').notNull().default(false),
  createdBy: text('created_by'),
  externalId: text('external_id'),
  gifUrl: text('gif_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  isCustomIdx: index('exercises_is_custom_idx').on(t.isCustom),
  createdByIdx: index('exercises_created_by_idx').on(t.createdBy),
  equipmentIdIdx: index('exercises_equipment_id_idx').on(t.equipmentId),
  externalIdIdx: index('exercises_external_id_idx').on(t.externalId),
}));

// ============================================================================
// routines
// ============================================================================

export const routines = pgTable('routines', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  exerciseConfig: jsonb('exercise_config').notNull().default(sql`'[]'::jsonb`),
  // Sharing seam columns — private-only in v1; columns exist for future flexibility
  visibility: text('visibility', {
    enum: ['private', 'trainer_visible', 'gym_visible', 'friends_visible', 'public'],
  }).notNull().default('private'),
  isShareable: boolean('is_shareable').notNull().default(false),
  originId: uuid('origin_id').references((): AnyPgColumn => routines.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('routines_user_id_idx').on(t.userId),
  visibilityIdx: index('routines_visibility_idx').on(t.visibility),
}));

// ============================================================================
// workout_sessions
// ============================================================================

export const workoutSessions = pgTable('workout_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  routineId: uuid('routine_id').references(() => routines.id),
  name: text('name'),
  status: text('status', {
    enum: ['in_progress', 'completed', 'abandoned'],
  }).notNull().default('in_progress'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  notes: text('notes'),
  externalSyncId: text('external_sync_id'),
  syncSource: text('sync_source', {
    enum: ['app', 'healthkit', 'health_connect'],
  }).notNull().default('app'),
  // Patch 8: gym binding, subjective effort, entry source
  gymId: uuid('gym_id'),
  subjectiveEffort: integer('subjective_effort'), // 1-4 scale
  entrySource: text('entry_source', {
    enum: ['manual', 'qr_scan', 'scheduled'],
  }).notNull().default('manual'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('sessions_user_id_idx').on(t.userId),
  statusIdx: index('sessions_status_idx').on(t.status),
  startedAtIdx: index('sessions_started_at_idx').on(t.startedAt),
  routineIdIdx: index('sessions_routine_id_idx').on(t.routineId),
  gymIdIdx: index('sessions_gym_id_idx').on(t.gymId),
}));

// ============================================================================
// set_groups (Patch 8)
// Links multiple workout_sets into supersets, drop sets, giant sets, circuits.
// ============================================================================

export const setGroups = pgTable('set_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  kind: text('kind', {
    enum: ['superset', 'drop_set', 'giant_set', 'circuit'],
  }).notNull(),
  rounds: integer('rounds'),
  restSeconds: integer('rest_seconds'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('set_groups_user_id_idx').on(t.userId),
  sessionIdIdx: index('set_groups_session_id_idx').on(t.sessionId),
}));

// ============================================================================
// gym_equipment_instances (Patch 8)
// Specific machines at specific gyms. gym_id references gyms(id) when it ships.
// ============================================================================

export const gymEquipmentInstances = pgTable('gym_equipment_instances', {
  id: uuid('id').primaryKey().defaultRandom(),
  gymId: uuid('gym_id').notNull(), // references gyms(id) when gyms table ships
  equipmentId: uuid('equipment_id').references(() => equipment.id),
  exerciseId: uuid('exercise_id').references(() => exercises.id),
  displayLabel: text('display_label').notNull(),
  pinToKg: jsonb('pin_to_kg'), // for selectorized machines: {"1": 5, "2": 10, ...}
  status: text('status', {
    enum: ['operational', 'maintenance', 'out_of_service'],
  }).notNull().default('operational'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  gymIdIdx: index('gym_equip_instances_gym_id_idx').on(t.gymId),
  equipmentIdIdx: index('gym_equip_instances_equipment_id_idx').on(t.equipmentId),
  exerciseIdIdx: index('gym_equip_instances_exercise_id_idx').on(t.exerciseId),
}));

// ============================================================================
// workout_sets
// ============================================================================

export const workoutSets = pgTable('workout_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => workoutSessions.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  userId: text('user_id').notNull(), // denormalized for RLS + PowerSync sync
  setIndex: integer('set_index').notNull(),
  weightValue: real('weight_value'),
  weightUnit: text('weight_unit', { enum: ['kg', 'lb'] }).notNull().default('kg'),
  reps: integer('reps'),
  rpe: real('rpe'),
  rir: integer('rir'),
  durationSeconds: integer('duration_seconds'),
  distanceValue: real('distance_value'),
  distanceUnit: text('distance_unit', { enum: ['km', 'mi', 'm'] }),
  bodyweightAtTime: real('bodyweight_at_time'),
  bodyweightUnit: text('bodyweight_unit', { enum: ['kg', 'lb'] }),
  isWarmup: boolean('is_warmup').notNull().default(false),
  isPersonalRecord: boolean('is_personal_record').notNull().default(false),
  notes: text('notes'),
  externalSyncId: text('external_sync_id'),
  syncSource: text('sync_source', {
    enum: ['app', 'healthkit', 'health_connect'],
  }).notNull().default('app'),
  performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
  // Patch 8: set group + equipment instance binding
  setGroupId: uuid('set_group_id').references(() => setGroups.id),
  setGroupPosition: integer('set_group_position'),
  gymEquipmentInstanceId: uuid('gym_equipment_instance_id').references(() => gymEquipmentInstances.id),
  pinPosition: integer('pin_position'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('sets_user_id_idx').on(t.userId),
  sessionIdIdx: index('sets_session_id_idx').on(t.sessionId),
  exerciseIdIdx: index('sets_exercise_id_idx').on(t.exerciseId),
  performedAtIdx: index('sets_performed_at_idx').on(t.performedAt),
  setGroupIdIdx: index('sets_set_group_id_idx').on(t.setGroupId),
  gymEquipmentInstanceIdIdx: index('sets_gym_equipment_instance_id_idx').on(t.gymEquipmentInstanceId),
}));

// ============================================================================
// user_exercise_preferences (Patch 8)
// Per-user per-exercise increment overrides and defaults.
// ============================================================================

export const userExercisePreferences = pgTable('user_exercise_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  defaultWeightIncrement: real('default_weight_increment'),
  defaultIncrementUnit: text('default_increment_unit', {
    enum: ['kg', 'lb', 'pin', 'plate'],
  }),
  defaultRepsIncrement: integer('default_reps_increment').default(1),
  defaultRestSeconds: integer('default_rest_seconds'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('user_exercise_prefs_user_id_idx').on(t.userId),
  exerciseIdIdx: index('user_exercise_prefs_exercise_id_idx').on(t.exerciseId),
  userExerciseUniq: unique('user_exercise_preferences_user_id_exercise_id_key').on(t.userId, t.exerciseId),
}));

// ============================================================================
// exercise_substitutions (Patch 8)
// Swap suggestions for pre-flight check (catalog data, read-only for users).
// ============================================================================

export const exerciseSubstitutions = pgTable('exercise_substitutions', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  substituteId: uuid('substitute_id').notNull().references(() => exercises.id),
  similarityScore: real('similarity_score').notNull().default(0.5),
  reasonLabel: text('reason_label').notNull().default('similar pattern'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  exerciseIdIdx: index('exercise_subs_exercise_id_idx').on(t.exerciseId),
  substituteIdIdx: index('exercise_subs_substitute_id_idx').on(t.substituteId),
  exerciseSubstituteUniq: unique('exercise_substitutions_exercise_id_substitute_id_key').on(t.exerciseId, t.substituteId),
}));
