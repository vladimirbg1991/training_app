-- ==========================================================================
-- Migration: 0003_subscriptions_body
-- Description: User subscriptions (RevenueCat mirror), body measurements,
--              and body circumference tables for Phase 5+6.
-- ==========================================================================

-- ==========================================================================
-- Table: user_subscriptions
-- RevenueCat entitlements mirrored via webhook Edge Function.
-- ==========================================================================

create table user_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               text not null,
  tier                  text not null default 'free' check (tier in ('free', 'trial', 'premium')),
  product_id            text,  -- pulse_annual, pulse_monthly, pulse_lifetime
  platform              text check (platform in ('ios', 'android', 'web')),
  expires_at            timestamptz,
  original_purchase_at  timestamptz,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table user_subscriptions enable row level security;

-- SELECT only for clients. INSERT/UPDATE restricted to service_role (RevenueCat webhook).
-- This prevents client-side entitlement spoofing.
create policy "subscriptions_select" on user_subscriptions
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create index subscriptions_user_id_idx on user_subscriptions (user_id);

create trigger subscriptions_updated_at
  before update on user_subscriptions
  for each row execute function update_updated_at();

-- ==========================================================================
-- Table: body_measurements
-- User-entered body weight, body fat, lean mass readings.
-- ==========================================================================

create table body_measurements (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null,
  recorded_at         timestamptz not null,
  weight_value        real,
  weight_unit         text check (weight_unit in ('kg', 'lb')),
  body_fat_percent    real check (body_fat_percent >= 0 and body_fat_percent <= 100),
  lean_mass_value     real,
  lean_mass_unit      text check (lean_mass_unit in ('kg', 'lb')),
  notes               text,
  external_sync_id    text,
  sync_source         text not null default 'app' check (sync_source in ('app', 'healthkit', 'health_connect')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table body_measurements enable row level security;

create policy "body_measurements_select" on body_measurements
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "body_measurements_insert" on body_measurements
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "body_measurements_update" on body_measurements
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "body_measurements_delete" on body_measurements
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create index body_measurements_user_id_idx on body_measurements (user_id);
create index body_measurements_recorded_at_idx on body_measurements (recorded_at);

create trigger body_measurements_updated_at
  before update on body_measurements
  for each row execute function update_updated_at();

-- ==========================================================================
-- Table: body_circumference
-- Per-site circumference measurements (chest, arm, waist, thigh, custom).
-- ==========================================================================

create table body_circumference (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  site          text not null check (site in ('chest', 'arm', 'arm_left', 'arm_right', 'waist', 'hip', 'thigh', 'thigh_left', 'thigh_right', 'calf', 'calf_left', 'calf_right', 'neck', 'forearm', 'custom')),
  custom_label  text,  -- only used when site='custom'
  value_cm      real not null,
  recorded_at   timestamptz not null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table body_circumference enable row level security;

create policy "body_circumference_select" on body_circumference
  for select to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "body_circumference_insert" on body_circumference
  for insert to authenticated
  with check (user_id = (select auth.jwt() ->> 'sub'));

create policy "body_circumference_update" on body_circumference
  for update to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create policy "body_circumference_delete" on body_circumference
  for delete to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'));

create index body_circumference_user_id_idx on body_circumference (user_id);
create index body_circumference_recorded_at_idx on body_circumference (recorded_at);

create trigger body_circumference_updated_at
  before update on body_circumference
  for each row execute function update_updated_at();
