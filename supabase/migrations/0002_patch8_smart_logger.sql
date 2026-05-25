-- ==========================================================================
-- Migration: 0002_patch8_smart_logger
-- Description: Patch 8 additions for the smart logger
-- New tables: set_groups, gym_equipment_instances, user_exercise_preferences,
--             exercise_substitutions
-- Altered tables: workout_sets (set group + equipment binding),
--                 workout_sessions (gym, subjective effort, entry source)
--
-- Design principles (same as 0001):
--   - UUIDs everywhere (never auto-increment; sync-safe)
--   - user_id is TEXT matching Clerk JWT 'sub' claim
--   - RLS on every table, using (select auth.jwt() ->> 'sub') for 100x perf
--   - All RLS-referenced columns indexed
--   - updated_at auto-maintained via trigger
-- ==========================================================================

-- ==========================================================================
-- Table: set_groups
-- Links multiple workout_sets into supersets, drop sets, giant sets, circuits.
-- ==========================================================================

create table set_groups (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references workout_sessions(id) on delete cascade,
  user_id       text not null,
  kind          text not null check (kind in ('superset', 'drop_set', 'giant_set', 'circuit')),
  rounds        integer,
  rest_seconds  integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ==========================================================================
-- Table: gym_equipment_instances
-- Specific machines at specific gyms.
-- gym_id references gyms(id) when gyms table ships (Phase 2+).
-- ==========================================================================

create table gym_equipment_instances (
  id             uuid primary key default gen_random_uuid(),
  gym_id         uuid not null,  -- references gyms(id) when gyms table ships
  equipment_id   uuid references equipment(id),
  exercise_id    uuid references exercises(id),
  display_label  text not null,  -- "Bench 3", "Cable station 1", "Power rack 2"
  pin_to_kg      jsonb,          -- for selectorized machines: {"1": 5, "2": 10, ...}
  status         text not null default 'operational' check (status in (
                   'operational', 'maintenance', 'out_of_service'
                 )),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ==========================================================================
-- Table: user_exercise_preferences
-- Per-user per-exercise increment overrides and defaults.
-- ==========================================================================

create table user_exercise_preferences (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   text not null,
  exercise_id               uuid not null references exercises(id),
  default_weight_increment  real,
  default_increment_unit    text check (default_increment_unit in ('kg', 'lb', 'pin', 'plate')),
  default_reps_increment    integer default 1,
  default_rest_seconds      integer,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique(user_id, exercise_id)
);

-- ==========================================================================
-- Table: exercise_substitutions
-- Swap suggestions for pre-flight check (catalog data, read-only for users).
-- ==========================================================================

create table exercise_substitutions (
  id                uuid primary key default gen_random_uuid(),
  exercise_id       uuid not null references exercises(id),
  substitute_id     uuid not null references exercises(id),
  similarity_score  real not null default 0.5,
  reason_label      text not null default 'similar pattern',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(exercise_id, substitute_id)
);

-- ==========================================================================
-- Alter: workout_sets — set group and equipment instance binding
-- ==========================================================================

alter table workout_sets add column set_group_id uuid references set_groups(id);
alter table workout_sets add column set_group_position integer;
alter table workout_sets add column gym_equipment_instance_id uuid references gym_equipment_instances(id);
alter table workout_sets add column pin_position integer;

-- ==========================================================================
-- Alter: workout_sessions — gym, subjective effort, entry source
-- ==========================================================================

alter table workout_sessions add column gym_id uuid;
alter table workout_sessions add column subjective_effort integer check (subjective_effort >= 1 and subjective_effort <= 4);
alter table workout_sessions add column entry_source text not null default 'manual' check (entry_source in ('manual', 'qr_scan', 'scheduled'));

-- ==========================================================================
-- Enable Row Level Security on new tables
-- ==========================================================================

alter table set_groups                enable row level security;
alter table gym_equipment_instances   enable row level security;
alter table user_exercise_preferences enable row level security;
alter table exercise_substitutions    enable row level security;

-- ==========================================================================
-- RLS Policies
--
-- Same conventions as 0001:
--   (select auth.jwt() ->> 'sub')   -- 100x perf vs bare auth.jwt() ->> 'sub'
--   TO authenticated                -- no anon access to any table
-- ==========================================================================

-- -- set_groups: own set groups only (user data) ----------------------------

create policy "set_groups_select" on set_groups
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "set_groups_insert" on set_groups
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "set_groups_update" on set_groups
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "set_groups_delete" on set_groups
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

-- -- gym_equipment_instances: read-only shared data -------------------------
-- SELECT for all authenticated; write ops managed by admin functions

create policy "gym_equipment_instances_select" on gym_equipment_instances
  for select to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE: managed by gym admin functions

-- -- user_exercise_preferences: own preferences only (user data) ------------

create policy "user_exercise_prefs_select" on user_exercise_preferences
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "user_exercise_prefs_insert" on user_exercise_preferences
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "user_exercise_prefs_update" on user_exercise_preferences
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "user_exercise_prefs_delete" on user_exercise_preferences
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

-- -- exercise_substitutions: read-only catalog data -------------------------
-- SELECT for all authenticated; write ops managed by seed scripts / admin

create policy "exercise_substitutions_select" on exercise_substitutions
  for select to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE: managed by seed scripts and admin functions

-- ==========================================================================
-- Indexes
--
-- Every column referenced in an RLS policy MUST be indexed.
-- Additional indexes on high-cardinality FK columns.
-- ==========================================================================

-- set_groups: RLS references user_id; session_id for FK joins
create index set_groups_user_id_idx    on set_groups (user_id);
create index set_groups_session_id_idx on set_groups (session_id);

-- gym_equipment_instances: gym_id, equipment_id, exercise_id for FK joins
create index gym_equip_instances_gym_id_idx       on gym_equipment_instances (gym_id);
create index gym_equip_instances_equipment_id_idx on gym_equipment_instances (equipment_id);
create index gym_equip_instances_exercise_id_idx  on gym_equipment_instances (exercise_id);

-- user_exercise_preferences: RLS references user_id; exercise_id for FK joins
-- unique(user_id, exercise_id) covers the composite lookup
create index user_exercise_prefs_user_id_idx     on user_exercise_preferences (user_id);
create index user_exercise_prefs_exercise_id_idx on user_exercise_preferences (exercise_id);

-- exercise_substitutions: exercise_id, substitute_id for FK joins
-- unique(exercise_id, substitute_id) covers the composite lookup
create index exercise_subs_exercise_id_idx   on exercise_substitutions (exercise_id);
create index exercise_subs_substitute_id_idx on exercise_substitutions (substitute_id);

-- New columns on existing tables
create index sets_set_group_id_idx              on workout_sets (set_group_id);
create index sets_gym_equipment_instance_id_idx on workout_sets (gym_equipment_instance_id);
create index sessions_gym_id_idx                on workout_sessions (gym_id);

-- ==========================================================================
-- Triggers: auto-update updated_at on every row modification
-- ==========================================================================

create trigger set_groups_updated_at
  before update on set_groups
  for each row execute function update_updated_at();

create trigger gym_equipment_instances_updated_at
  before update on gym_equipment_instances
  for each row execute function update_updated_at();

create trigger user_exercise_preferences_updated_at
  before update on user_exercise_preferences
  for each row execute function update_updated_at();

create trigger exercise_substitutions_updated_at
  before update on exercise_substitutions
  for each row execute function update_updated_at();
