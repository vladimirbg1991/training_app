# Local-First Sync Architecture

## The Promise

The app reads and writes only against a local SQLite database. The user never waits for the network. Data eventually reaches Supabase Postgres via PowerSync, but the user does not know or care when that happens.

## The Data Flow

### Write Path (user logs a set)

```
User taps "log set"
    ↓
useLogSet hook generates UUID v7 client-side
    ↓
Drizzle INSERT into local SQLite (transaction includes session.updated_at update)
    ↓
Haptics.ImpactFeedbackStyle.Medium fires
    ↓
UI re-renders from SQLite (via useLiveQuery / TanStack Query subscription)
    ↓ [the user moves on; everything below is async]
PowerSync CRUD log captures the INSERT
    ↓
PowerSync uploads to its service (when network available)
    ↓
PowerSync service writes to Postgres
    ↓
Postgres RLS validates the write
    ↓
Row exists on the server (queryable from web admin, syncable to other devices)
```

### Read Path (user opens exercise history)

```
User taps "history" on an exercise card
    ↓
Component reads from local SQLite via Drizzle (instant)
    ↓
UI renders the data
    ↓ [no network involvement on the read path]
```

### Sync Path (server → device, e.g., trainer assigns a routine)

```
Trainer's app writes to assignments table (in their local SQLite)
    ↓
PowerSync uploads to server (RLS allows because trainer owns the row)
    ↓
PowerSync replication: server detects new row matching client's stream rules
    ↓
PowerSync pushes the row down to client device
    ↓
Client SQLite receives the row
    ↓
useLiveQuery in client UI fires; "New routine assigned" UI updates
```

## Sync Streams (NOT legacy Sync Rules)

PowerSync Sync Streams (beta but production-ready) define which rows replicate to which devices. Use Sync Streams from day one — they support JOINs, nested subqueries, TTL caching, and `auto_subscribe: true`.

Our streams:

**user_data** — every row owned by the requesting user. Filters by `user_id = request.jwt.sub`.

**catalog** — global exercises and equipment. No filter; replicates to every authenticated user.

**trainer_clients** — for trainer accounts, the workouts and sets of their assigned clients.

**gym_aggregates** — for gym admin accounts, anonymized aggregate data via materialized views.

The full streams config is at `packages/sync/src/streams.ts`.

## Conflict Resolution

PowerSync uses last-write-wins by `updated_at` timestamp. For our domain:

- **Same-user, multi-device edits to the same set:** LWW. Acceptable.
- **Trainer overwrites a stale client edit:** trainer's `updated_at` is later, LWW gives trainer's version.
- **Workout-session status:** if device A marks "completed" and device B is mid-edit, we compare timestamps with a 30-second write-skew detection.

## The In-Progress Snapshot

During an active workout, the app writes to `workout_sessions.status = 'in_progress'`. The active store also writes a JSON snapshot to MMKV (debounced 500ms) containing the live in-flight state.

On app launch, the root layout reads MMKV first. If a session is found:

1. Navigate to `/workout` directly.
2. Hydrate the active store from the snapshot.
3. Restore draft inputs.
4. Compute remaining rest-timer time from `restTimerStartedAt`.

This makes "the screen state is sacred" rule operational.

## Failure Modes & Recovery

**Network drops mid-workout:** PowerSync queues writes. Queue flushes when network returns.

**App killed mid-set:** MMKV snapshot survives. On relaunch, the user sees the half-typed value.

**Phone dies during workout:** Same as kill — SQLite and MMKV are durable.

**Postgres goes down:** PowerSync queues uploads. Mobile app continues to function fully.

**PowerSync service goes down:** Same as Postgres down.

**User signs in on a fresh device:** PowerSync downloads the user's bucket from scratch.

## Two-Speed Data Architecture

The platform has two fundamentally different data access patterns:

**Speed 1 — Local-First Personal Data (PowerSync + SQLite).** Bounded, owned by the user. Every read goes through SQLite. Every write goes through SQLite first, syncs in background.

**Speed 2 — Online-First Aggregate Data (server query, paginated).** Unbounded, cross-user. Future feeds, public routine library, leaderboards. Server-paginated queries via TanStack Query, never written to local SQLite.

**The rule:** if a user can write it and own it → Speed 1. If a user can browse it across other users' content → Speed 2.

## What This Architecture Costs

PowerSync service is a paid product. Free tier exists for development; production tier scales with active connections and data volume.

There is a small data-transfer cost on first-sync for users with years of history. We mitigate with initial-sync-on-WiFi.

The schema must always be designed with sync in mind: UUIDs not auto-increment, denormalized `user_id` on every row, `updated_at` on every row, no binary data in tables.

## What This Architecture Gives Us

- 0ms latency on every user action.
- 100% feature parity offline.
- Multi-device sync without custom code.
- A path to web admin and Apple Watch using the same data.
- Trainer-client and gym-member features without re-architecting.
