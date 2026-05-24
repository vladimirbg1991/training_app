# ADR 0002 — Use PowerSync over WatermelonDB for Local-First Sync

**Date:** 2026-05-07
**Status:** Accepted
**Decider:** project owner

## Context

The app must work offline-first with eventual consistency to a Postgres backend. Options considered: PowerSync, WatermelonDB, ElectricSQL, LiveStore, Replicache, Zero, Triplit, hand-rolled queue.

## Decision

PowerSync. Use Sync Streams (beta but production-ready), not legacy Sync Rules YAML.

## Rationale

PowerSync is purpose-built for the Postgres-to-SQLite sync model and integrates natively with Supabase. It handles bidirectional sync, partial replication via Sync Streams, and conflict resolution out of the box.

WatermelonDB has slowed to a release every 9 months and still requires building the entire sync server yourself. Multiple production teams have migrated *from* WatermelonDB *to* PowerSync.

ElectricSQL pivoted in 2024 to a long-polling write-it-yourself system with no first-class React Native SDK.

Zero shipped 1.0 in early 2026 but has no React Native client.

Triplit was acqui-hired into Supabase October 2025 and is now community-maintained.

LiveStore is fascinating but its single-user data model breaks gym-shared programs.

PowerSync's pricing is reasonable: $49/mo Pro, scales linearly.

## Consequences

- Schema must follow PowerSync conventions (UUIDs, `updated_at`, denormalized `user_id`).
- Sync Streams must be kept in sync with schema changes.
- Adding a new synced table requires updating both the Drizzle schema and the streams config.
- Schema migrations TRUNCATE before DROP — design with this in mind.

## Revisit When

- PowerSync pricing becomes prohibitive at scale.
- A core feature requires a sync pattern PowerSync doesn't support.
