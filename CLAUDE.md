# Fitness Tracking Platform — System Supervisor

## Project Identity

A premium, local-first fitness and gym-progress tracking application targeting iOS and Android. The product directly competes with Hevy, Strong, Fitbod, JEFIT, and the Gymshark Training App. Every architectural decision is grounded in a single goal: never lose a user's input, never block a user's flow, never make them wait when they are mid-workout.

The product surfaces three user types — individual lifters, personal trainers, and gym operators — each of which receives a different feature scope on top of a shared core. The core is the workout-logging loop: log a set in under two taps, in under 100ms, regardless of network state, regardless of whether the screen was just locked.

## Tech Stack (locked — do not deviate without explicit instruction from the project owner)

The stack below was chosen to maximize three properties: offline reliability, AI-agent productivity, and platform parity between iOS and Android. It was validated against a deep 2026 industry research review.

**Frontend layer.** React Native with Expo SDK 54+ (managed workflow with Development Builds). Expo Router v6 for file-based navigation. NativeWind v4 for Tailwind-style utility classes. Zustand for ephemeral UI state and TanStack Query v5 for server-state caching, both persisted to MMKV. FlashList v2 for any list with more than ten items. Reanimated 4 + Gesture Handler for animations. Hermes V1 (default in RN 0.84+). New Architecture (Fabric/TurboModules/Bridgeless) — mandatory in RN 0.82+. TypeScript in strict mode is non-negotiable.

**Local-first sync layer.** PowerSync as the sync engine (Sync Streams beta, NOT legacy Sync Rules YAML), mirroring a SQLite database on the device with a Supabase Postgres database in the cloud. The mobile app reads and writes only against SQLite — Supabase is never called directly from the UI thread. SQLite uses WAL mode with `busy_timeout=2000` and `synchronous=NORMAL`. The active-workout snapshot is persisted via MMKV (synchronous, ~30× faster than AsyncStorage) and flushed to SQLite on every state change.

**Backend layer.** Supabase provides Postgres, Storage, and Realtime channels. **Authentication is Clerk-as-IdP**, configured as a Supabase third-party auth provider. PowerSync verifies Clerk-issued JWTs directly via Clerk's JWKS. Drizzle ORM is the query builder of choice, on both server (Postgres via Supabase Edge Functions and workers) and client (SQLite via PowerSync). Node.js 22 LTS for standalone worker processes hosted on Fly.io or Railway (NOT Supabase Edge Functions — they cannot hold persistent BullMQ Redis connections). BullMQ on Redis Cloud or Upstash Fixed plan (NOT Upstash pay-as-you-go — BullMQ's polling pattern produces billing surprises). Long-lived workers connect to Postgres via direct connection on port 5432 with the IPv4 add-on, NOT via Supavisor (which has a documented connection-leak bug with long-lived TCP).

**Subscription layer.** RevenueCat from day one (free tier covers up to $10K MTR; ~1% MTR after $2.5K). Layer Superwall when paywall iteration becomes a bottleneck (~$25K MTR). Server-side entitlements are mirrored to a Supabase `entitlements` table via RC webhooks.

**Media layer.** Mux for adaptive bitrate streaming of exercise demonstration videos, with `expo-video` as the player and `expo-video-cache` for iOS HLS offline caching. User-initiated "Download for offline" pre-caches all videos for a routine before a user heads to a basement gym. Supabase Storage for static images and user-uploaded content.

**Native integrations.** Expo Haptics for set-completion feedback. Expo Notifications for local and remote pushes. `expo-live-activity` for iOS Live Activities and Dynamic Island (the rest timer is a Live Activity in v1). HealthKit on iOS and Health Connect on Android, both behind a single internal abstraction (Phase 2; schema ready in v0). Expo Camera plus a QR scanner package for the scan-to-prefill workflow. Apple Watch is **native SwiftUI**, NOT React Native — RN does not run on watchOS — bridged via `react-native-watch-connectivity` (Phase 2).

**DevOps & observability.** EAS Build for App Store and Play Store builds. Sentry for crash reporting and performance monitoring (Hermes-aware, New Architecture supported, UI Profiling GA on both platforms). PostHog for analytics, feature flags, session replay, and experiments (one tool, EU region, free up to 1M events). Postmark for transactional email (98.7% inbox placement vs SendGrid 95.3%). The repository is a pnpm workspaces monorepo orchestrated by Turborepo. The package manager is pnpm — never npm, never yarn.

## Monorepo Layout

```
/
├── CLAUDE.md                          ← This file (supervisor)
├── .claude/
│   └── agents/                        ← Specialist subagents
├── .context/                          ← Knowledge library (read-only reference)
│   ├── theory/                        ← Fitness science, training methodology
│   ├── api/                           ← ExerciseDB, Wger, Mux API docs
│   ├── strategy/                      ← Competitor analysis, product pillars
│   ├── architecture/                  ← Diagrams, sync model, deep-link spec
│   ├── decisions/                     ← Architecture Decision Records
│   ├── features/                      ← Feature ledger maintained by feature-tracker
│   └── notes/                         ← Idea log maintained by note-keeper
├── apps/
│   ├── mobile/                        ← Expo / React Native app (the product)
│   └── worker/                        ← Node.js background workers (BullMQ)
├── packages/
│   ├── domain/                        ← Zod schemas + TypeScript types (zero deps)
│   ├── data-sources/                  ← ExerciseDB client, Mux client, adapters
│   ├── transforms/                    ← Raw API JSON → domain types
│   ├── sync/                          ← PowerSync schema, conflict-resolution rules
│   ├── ui/                            ← Shared React Native components
│   └── fitness-logic/                 ← Pure functions: 1RM, volume, ΔRPE, etc.
├── supabase/
│   ├── migrations/                    ← SQL migrations (committed)
│   ├── functions/                     ← Edge Functions (webhooks only)
│   └── seed/                          ← Seed scripts (Core 50 exercises, equipment)
└── data/
    └── exercises/
        └── seed-2026.json             ← Bundled exercise/equipment seed data
```

## The Three Data Pillars

Every piece of data in this system belongs to exactly one of three pillars, and the data-sync-engineer agent enforces this boundary on every change.

The first pillar is **user data** — workouts, sets, reps, body measurements, custom exercises, custom routines. Owned by the user, lives primarily in SQLite on the device, syncs to Supabase Postgres via PowerSync, and is protected by Supabase Row Level Security so that one user's "Grandpa's Secret Bicep Finisher" can never be seen by another user.

The second pillar is **catalog data** — the global library of exercises, equipment, muscle groups, and seeded routines. Read-only for end users. Sourced primarily from ExerciseDB. Bundled into a seed JSON file at build time and refreshed quarterly. Runtime API calls happen only through a server-side Edge Function so the API key never reaches the device.

The third pillar is **derived and external data** — Mux video URLs, HealthKit/Health Connect data, push notification tokens, RevenueCat entitlements, and analytics events. Flow in and out through dedicated specialists.

## Non-Negotiable Rules (enforce on every task — balanced strictness)

These rules are enforced on every task by every agent. They correspond to documented failure modes in competitor apps. Agents warn loudly on rule violations and provide the fix, but the project owner can override during prototyping by saying `override: [reason]`. Overrides must be logged by the note-keeper agent.

**Never lose a user input.** Every interaction that produces data — a logged set, a weight change, a completed workout, a body-weight measurement — is written to local SQLite synchronously before the UI animates a confirmation. The write is then queued for sync. If the device is offline, the queue persists. If the app is killed mid-set, the partially-completed workout is reconstructed from a periodic in-progress snapshot stored in MMKV and flushed to SQLite.

**Never block on the network.** UI components do not call `fetch`. UI components read from SQLite (via Drizzle through a thin local-data hook layer) or from TanStack Query caches that are themselves backed by SQLite. The only place network calls live is in `packages/data-sources/` and Supabase Edge Functions.

**The screen state is sacred.** When the app is backgrounded, screen-locked, or interrupted by a phone call mid-workout, the user returns to exactly the same screen with exactly the same in-progress state.

**API keys never reach the device.** ExerciseDB, Mux, RevenueCat secret keys, and any third-party paid API is called only from Supabase Edge Functions or workers, with secrets stored in the relevant secret manager.

**Row Level Security is on by default.** Every Postgres table that contains user data has an RLS policy that filters by `auth.jwt() ->> 'sub'` (which works identically for Clerk and Supabase JWTs). Every column referenced in an RLS policy is indexed, and `auth.uid()` (or `auth.jwt() ->> 'sub'`) is wrapped in `(select ...)` for the documented 100× perf improvement.

**TypeScript strict mode, no `any`.** Domain types in `packages/domain/` are the source of truth.

**Every weight, rep, or distance value carries a unit.** A `Weight` is never just a number — it is `{ value: number; unit: 'kg' | 'lb' }`. The fitness-domain-expert owns the unit-system rules.

**Bodyweight matters.** Pull-ups, dips, and any bodyweight-loaded exercise must capture the user's body weight at the time of the set, so progressive overload tracking is accurate when the user gains or loses weight.

**Two-speed data architecture.** Personal data uses PowerSync local-first. Aggregate/feed data (when it eventually ships) uses server-paginated queries — never PowerSync. This rule prevents the worst class of bug in social fitness apps.

## Subagent Routing Guide

When starting a task, identify which specialist applies.

| Task type | Invoke agent |
|---|---|
| Architecture boundaries, new packages, layer communication | `system-architect` |
| React Native, Expo, navigation, gestures, lists | `mobile-architect` |
| PowerSync, SQLite, Drizzle, Supabase Postgres, sync conflicts | `data-sync-engineer` |
| Edge Functions, BullMQ workers, scheduled jobs, server-side API integration | `backend-engineer` |
| Env vars, auth, RLS, deep-link sanitization, new packages | `security-guardian` |
| Exercises, equipment, muscle groups, training methodology, unit semantics, App Store positioning | `fitness-domain-expert` |
| User flows, screen-state preservation, tap targets, friction budget | `ux-flow-architect` |
| QR codes, deep links, universal links, parameter prefill | `qr-and-deeplink-specialist` |
| Push notifications, Live Activities, Dynamic Island, rest timers | `notifications-engineer` |
| HealthKit, Health Connect, deduplication | `health-integration-specialist` |
| Final review before any feature is considered done | `code-reviewer` |
| Logging features, ideas, capabilities for help/Q&A/training | `feature-tracker` |
| Capturing decisions, deferred ideas, cross-session memory | `note-keeper` |

For tasks that touch multiple domains, invoke the system-architect first to confirm the boundary plan, route to specialists, then close with the code-reviewer and (if applicable) the security-guardian.

## Override Protocol (balanced strictness)

When an agent flags a violation, the user has three options:

1. Fix it as suggested (default).
2. Discuss the rule with the agent (the agent must explain *why* the rule exists, citing the relevant context file).
3. Override with a logged exception (`override: [reason]`). The note-keeper agent records every override in `.context/notes/overrides.md` with timestamp, file affected, rule violated, and stated reason. The code-reviewer surfaces overrides in its final report.

Overrides are valid for prototyping but the code-reviewer treats unresolved overrides as blockers before any production deploy.

## Current Phase

**Phase: v0 — Project Bootstrap.** The repository is being set up. No code has been written yet. The first concrete deliverables are the monorepo skeleton, the Supabase project, the Clerk project, the initial domain schema for exercises and workouts, and a "hello world" Expo app that can log a single set offline and sync it when online.

**iOS-first, Android-parity-from-day-one.** The app targets iOS first for polish (Live Activities, HealthKit, Haptics) but every component is built cross-platform from day one — there is no "Android version later" rewrite.

**Three-user model from v0.** Sign-up captures user type (lifter, trainer, gym) via Clerk Organizations. The database schema reflects this from the first migration, even though trainer and gym features are stubbed for v1.

**Private-by-default, with sharing-shaped seams.** v1 ships with no public sharing, no social feed, no follower model. Schema includes three sharing-related columns (`visibility`, `is_shareable`, `origin_id`) on every shareable entity from day one so future sharing is a policy migration, not a rewrite.

## Project Memory — Key Constraints

ExerciseDB is chosen over Wger for catalog data — see `.context/decisions/0001-exercisedb-over-wger.md`. PowerSync is chosen over WatermelonDB for sync — see ADR 0002. Drizzle is chosen over Prisma for ORM — see ADR 0003. Tech stack and agent scaffold validated by second-opinion review — see ADR 0004.

The unit system is dual — kg and lb are both first-class. Users pick a default in onboarding but every individual exercise can override the default.

QR codes use a custom URL scheme `gymapp://` and HTTPS universal links to a domain TBD. Every deep link carries a signed JWT validated by the app before pre-filling fields.

Apple Health and Health Connect are deferred to Phase 2 but the database schema includes `external_sync_id` and `sync_source` columns from v0.

Apple Watch is deferred to Phase 2/3 and will be built natively in SwiftUI, not React Native.

Offline mode is the default state. The app does not show a "you are offline" banner unless the user attempts an action that genuinely requires the server.

## Reference Files in `.context/`

The `.context/strategy/competitor-analysis.md` file contains the full Hevy/Strong/Fitbod/JEFIT/Gymshark teardown.

The `.context/strategy/stack-validation-2026.md` file contains the deep 2026 industry research that validated the tech stack.

The `.context/architecture/local-first-sync.md` file diagrams the data flow.

The `.context/decisions/` directory contains short Architecture Decision Records.

The `.context/features/feature-ledger.md` file is maintained by the feature-tracker agent.

The `.context/notes/idea-log.md`, `decisions-log.md`, and `overrides.md` are maintained by the note-keeper agent.

## How to Start a Claude Code Session

At the start of any session, Claude Code reads this file. For most tasks, immediately invoke the relevant specialist using the routing guide above. Always close any task that touches code with the code-reviewer agent.
