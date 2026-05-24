/**
 * Drizzle ORM schema for the Fitness Tracking Platform.
 *
 * Source of truth for TypeScript types derived from the Postgres schema.
 * Mirrors supabase/migrations/0001_initial.sql — keep in sync.
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('sessions_user_id_idx').on(t.userId),
  statusIdx: index('sessions_status_idx').on(t.status),
  startedAtIdx: index('sessions_started_at_idx').on(t.startedAt),
  routineIdIdx: index('sessions_routine_id_idx').on(t.routineId),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('sets_user_id_idx').on(t.userId),
  sessionIdIdx: index('sets_session_id_idx').on(t.sessionId),
  exerciseIdIdx: index('sets_exercise_id_idx').on(t.exerciseId),
  performedAtIdx: index('sets_performed_at_idx').on(t.performedAt),
}));
