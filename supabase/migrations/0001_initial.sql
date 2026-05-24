-- ==========================================================================
-- Migration: 0001_initial
-- Description: Initial schema for the Fitness Tracking Platform (v0)
-- Tables: users, equipment, exercises, routines, workout_sessions, workout_sets
--
-- Design principles:
--   - UUIDs everywhere (never auto-increment; sync-safe)
--   - user_id is TEXT matching Clerk JWT 'sub' claim
--   - RLS on every table, using (select auth.jwt() ->> 'sub') for 100x perf
--   - All RLS-referenced columns indexed
--   - Sharing seam columns on routines (visibility, is_shareable, origin_id)
--   - external_sync_id + sync_source on sessions/sets for Phase 2 health sync
--   - updated_at auto-maintained via trigger
-- ==========================================================================

-- gen_random_uuid() is built-in from Postgres 13+, but enable pgcrypto
-- for broader compatibility with Supabase tooling
create extension if not exists "pgcrypto";

-- ==========================================================================
-- Helper: auto-update updated_at on every row modification
-- ==========================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ==========================================================================
-- Table: users
-- Extends Clerk identity. PK matches Clerk JWT 'sub' claim (TEXT, not UUID).
-- ==========================================================================

create table users (
  id                        text primary key,
  user_type                 text not null check (user_type in ('lifter', 'trainer', 'gym')),
  display_name              text,
  default_unit              text not null default 'kg' check (default_unit in ('kg', 'lb')),
  default_rest_seconds      integer not null default 90,
  onboarding_completed      boolean not null default false,
  current_bodyweight_value  real,
  current_bodyweight_unit   text check (current_bodyweight_unit in ('kg', 'lb')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ==========================================================================
-- Table: equipment
-- Global catalog. Read-only for end users. Seeded from data/exercises/.
-- ==========================================================================

create table equipment (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text check (category in (
                'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight',
                'band', 'kettlebell', 'plate', 'other'
              )),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ==========================================================================
-- Table: exercises
-- Global catalog (is_custom = false) + user-created custom exercises.
-- RLS: SELECT if global OR owned by requesting user.
-- ==========================================================================

create table exercises (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  instructions      text,
  body_part         text,
  target_muscle     text,
  secondary_muscles jsonb not null default '[]'::jsonb,
  equipment_id      uuid references equipment(id),
  is_custom         boolean not null default false,
  created_by        text,       -- null for global catalog; Clerk sub for custom
  external_id       text,       -- ExerciseDB ID for catalog refresh
  gif_url           text,       -- ExerciseDB GIF URL (proxied)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ==========================================================================
-- Table: routines
-- User-created workout templates with sharing-seam columns.
--
-- exercise_config JSONB structure (validated by Zod in app layer):
-- [
--   {
--     "exerciseId": "uuid",
--     "targetSets": 3,
--     "targetReps": 10,
--     "targetWeightValue": 100.0,
--     "targetWeightUnit": "kg",
--     "restSeconds": 90,
--     "notes": ""
--   }
-- ]
-- ==========================================================================

create table routines (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  name            text not null,
  description     text,
  exercise_config jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(exercise_config) = 'array'),
  -- Sharing seam: private-only in v1; columns exist for future flexibility
  visibility      text not null default 'private' check (visibility in (
                    'private', 'trainer_visible', 'gym_visible',
                    'friends_visible', 'public'
                  )),
  is_shareable    boolean not null default false,
  origin_id       uuid references routines(id),  -- clone attribution
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ==========================================================================
-- Table: workout_sessions
-- A single workout instance. Status tracks lifecycle.
-- ==========================================================================

create table workout_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  routine_id        uuid references routines(id),
  name              text,
  status            text not null default 'in_progress' check (status in (
                      'in_progress', 'completed', 'abandoned'
                    )),
  started_at        timestamptz not null,
  completed_at      timestamptz,
  duration_seconds  integer,
  notes             text,
  -- Phase 2: HealthKit / Health Connect integration columns
  external_sync_id  text,
  sync_source       text not null default 'app' check (sync_source in (
                      'app', 'healthkit', 'health_connect'
                    )),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ==========================================================================
-- Table: workout_sets
-- Individual sets logged during a session.
-- user_id is denormalized (also on session) for RLS + PowerSync sync.
-- ==========================================================================

create table workout_sets (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references workout_sessions(id) on delete cascade,
  exercise_id         uuid not null references exercises(id),
  user_id             text not null,
  set_index           integer not null,
  weight_value        real,
  weight_unit         text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  reps                integer,
  rpe                 real check (rpe >= 1 and rpe <= 10),  -- Rate of Perceived Exertion
  rir                 integer check (rir >= 0),             -- Reps in Reserve
  duration_seconds    integer,    -- timed exercises (planks, holds)
  distance_value      real,       -- cardio / distance exercises
  distance_unit       text check (distance_unit in ('km', 'mi', 'm')),
  bodyweight_at_time  real,       -- user's body weight at time of set
  bodyweight_unit     text check (bodyweight_unit in ('kg', 'lb')),
  is_warmup           boolean not null default false,
  is_personal_record  boolean not null default false,
  notes               text,
  -- Phase 2: HealthKit / Health Connect integration columns
  external_sync_id    text,
  sync_source         text not null default 'app' check (sync_source in (
                        'app', 'healthkit', 'health_connect'
                      )),
  performed_at        timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ==========================================================================
-- Enable Row Level Security on ALL tables
-- ==========================================================================

alter table users             enable row level security;
alter table equipment         enable row level security;
alter table exercises         enable row level security;
alter table routines          enable row level security;
alter table workout_sessions  enable row level security;
alter table workout_sets      enable row level security;

-- ==========================================================================
-- RLS Policies
--
-- All policies use:
--   (select auth.jwt() ->> 'sub')   -- 100x perf vs bare auth.jwt() ->> 'sub'
--   TO authenticated                -- no anon access to any table
--
-- With Clerk-as-IdP, auth.jwt() ->> 'sub' returns the Clerk user ID.
-- ==========================================================================

-- -- users: own row only ------------------------------------------------

create policy "users_select" on users
  for select to authenticated
  using (id = (select auth.jwt() ->> 'sub'));

create policy "users_insert" on users
  for insert to authenticated
  with check (id = (select auth.jwt() ->> 'sub'));

create policy "users_update" on users
  for update to authenticated
  using (id = (select auth.jwt() ->> 'sub'));

-- No delete policy: account deletion is handled server-side

-- Note: user_id columns on routines, workout_sessions, and workout_sets
-- intentionally have NO foreign key to users(id). In a local-first sync
-- architecture, PowerSync mutation replay order is not guaranteed — a
-- workout_set row may reach Postgres before the users row on first sync.
-- Referential integrity is enforced at the application layer.

-- -- equipment: read-only global catalog --------------------------------

create policy "equipment_select" on equipment
  for select to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE: managed by seed scripts and admin functions

-- -- exercises: global catalog + own custom exercises -------------------

create policy "exercises_select" on exercises
  for select to authenticated
  using (
    is_custom = false
    or created_by = (select auth.jwt() ->> 'sub')
  );

create policy "exercises_insert" on exercises
  for insert to authenticated
  with check (
    is_custom = true
    and created_by = (select auth.jwt() ->> 'sub')
  );

create policy "exercises_update" on exercises
  for update to authenticated
  using (created_by = (select auth.jwt() ->> 'sub'))
  with check (
    is_custom = true
    and created_by = (select auth.jwt() ->> 'sub')
  );

create policy "exercises_delete" on exercises
  for delete to authenticated
  using (created_by = (select auth.jwt() ->> 'sub'));

-- -- routines: own routines only (v1: private) --------------------------
-- Future: add trainer_visible / gym_visible OR-branches (see data-sync-engineer agent)

create policy "routines_select" on routines
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "routines_insert" on routines
  for insert to authenticated
  with check (
    user_id = (select auth.jwt() ->> 'sub')
    and visibility = 'private'  -- v1: lock to private; loosen when sharing ships
  );

create policy "routines_update" on routines
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (
    user_id = (select auth.jwt() ->> 'sub')
    and visibility = 'private'  -- v1: lock to private; loosen when sharing ships
  );

create policy "routines_delete" on routines
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

-- -- workout_sessions: own sessions only --------------------------------

create policy "sessions_select" on workout_sessions
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "sessions_insert" on workout_sessions
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "sessions_update" on workout_sessions
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "sessions_delete" on workout_sessions
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

-- -- workout_sets: own sets only ----------------------------------------

create policy "sets_select" on workout_sets
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "sets_insert" on workout_sets
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "sets_update" on workout_sets
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "sets_delete" on workout_sets
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

-- ==========================================================================
-- Indexes
--
-- Every column referenced in an RLS policy MUST be indexed.
-- Additional indexes on high-cardinality query columns.
-- PKs are automatically indexed by Postgres.
-- ==========================================================================

-- exercises: RLS references is_custom, created_by
create index exercises_is_custom_idx   on exercises (is_custom);
create index exercises_created_by_idx  on exercises (created_by);
create index exercises_equipment_id_idx on exercises (equipment_id);
create index exercises_external_id_idx on exercises (external_id);

-- routines: RLS references user_id; visibility for future trainer/gym queries
create index routines_user_id_idx     on routines (user_id);
create index routines_visibility_idx  on routines (visibility);

-- workout_sessions: RLS references user_id; status for active-session lookup; routine_id for FK joins
create index sessions_user_id_idx     on workout_sessions (user_id);
create index sessions_status_idx      on workout_sessions (status);
create index sessions_started_at_idx  on workout_sessions (started_at);
create index sessions_routine_id_idx  on workout_sessions (routine_id);

-- workout_sets: RLS references user_id; session/exercise for joins
create index sets_user_id_idx         on workout_sets (user_id);
create index sets_session_id_idx      on workout_sets (session_id);
create index sets_exercise_id_idx     on workout_sets (exercise_id);
create index sets_performed_at_idx    on workout_sets (performed_at);

-- ==========================================================================
-- Triggers: auto-update updated_at on every row modification
-- ==========================================================================

-- -- Guard: prevent client-side user_type self-promotion ----------------
-- Role changes must go through a server-side Edge Function or worker.

create or replace function prevent_user_type_change()
returns trigger as $$
begin
  if new.user_type != old.user_type then
    raise exception 'user_type cannot be changed via client';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger users_prevent_type_change
  before update on users
  for each row execute function prevent_user_type_change();

create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger equipment_updated_at
  before update on equipment
  for each row execute function update_updated_at();

create trigger exercises_updated_at
  before update on exercises
  for each row execute function update_updated_at();

create trigger routines_updated_at
  before update on routines
  for each row execute function update_updated_at();

create trigger sessions_updated_at
  before update on workout_sessions
  for each row execute function update_updated_at();

create trigger sets_updated_at
  before update on workout_sets
  for each row execute function update_updated_at();
