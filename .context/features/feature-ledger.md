# Feature Ledger

> Canonical record of every feature in the Fitness Tracking Platform.
> Maintained by the `feature-tracker` agent. Do not edit manually.
> Last updated: 2026-05-24

---

## Table of Contents by Status

### Planned

| ID | Feature | Phase | User Type |
|----|---------|-------|-----------|
| `feat-001` | Local-first workout logging | v0 | all |
| `feat-002` | Sync via PowerSync with Sync Streams | v0 | all |
| `feat-003` | Three user types via Clerk Organizations | v0 | all |
| `feat-004` | Pre-loaded exercise catalog | v0 | all |
| `feat-005` | Equipment-based exercise filter | v0 | lifter |
| `feat-006` | Custom exercises | v0 | lifter |
| `feat-007` | Custom routines | v0 | lifter |
| `feat-008` | Workout-session screen-state preservation via MMKV | v0 | all |
| `feat-009` | QR code scan-to-prefill workflow | v1 | lifter |
| `feat-010` | Push notifications | v1 | all |
| `feat-011` | Live Activities and Dynamic Island | v1 | lifter |
| `feat-012` | Haptic feedback on set completion | v0 | lifter |
| `feat-013` | Personal record detection | v1 | lifter |
| `feat-014` | Bodyweight tracking integrated with bodyweight exercises | v0 | lifter |
| `feat-015` | Dual unit system (kg / lb) | v0 | all |
| `feat-016` | Apple Health integration | v2 | lifter |
| `feat-017` | Health Connect integration | v2 | lifter |
| `feat-018` | Mux video streaming for exercise demos | v1 | all |
| `feat-019` | Sensitivity to high-fatigue UX | v0 | all |
| `feat-020` | Trainer-client linking and routine assignment | v1 | trainer |
| `feat-021` | Gym operator dashboard | v2 | gym |
| `feat-022` | Pre-cache routine for offline | v1 | lifter |
| `feat-023` | Stepped numeric input with haptic increments | v0 | lifter |
| `feat-024` | Optimistic prefill on QR-code landing | v1 | lifter |
| `feat-025` | MHMDA / GDPR / CCPA compliance flow | v0 | all |
| `feat-026` | App Review submission positioning | v0 | all |
| `feat-027` | Three-column sharing seam | v0 | all |
| `feat-028` | Two-speed data architecture rule | v0 | all |
| `feat-033` | Clerk authentication with native Apple/Google/passkeys | v0 | all |
| `feat-034` | RevenueCat subscription with Supabase entitlements mirror | v0 | all |
| `feat-035` | PostHog analytics + feature flags + session replay | v0 | all |
| `feat-036` | Sentry crash reporting and UI Profiling | v0 | all |
| `feat-037` | Postmark transactional email | v1 | all |
| `feat-038` | Apple Watch native SwiftUI app | v2 | lifter |

### Idea (Deferred)

| ID | Feature | Phase | User Type |
|----|---------|-------|-----------|
| `feat-029` | Public routine library and cloning | future | all |
| `feat-030` | Friends-only social feed | future | lifter |
| `feat-031` | Public profile pages | future | all |
| `feat-032` | Per-PR share link | future | lifter |

---

## feat-001 -- Local-First Workout Logging

- **ID:** `feat-001`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** data-sync-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** Offline-first workout logging that writes every user input to local SQLite synchronously before confirming in the UI, ensuring zero data loss regardless of network state.
- **Rationale:** The single most common complaint in competitor app reviews (Hevy, Strong) is lost workout data -- either from spotty gym Wi-Fi, app crashes mid-set, or sync failures. The write-to-SQLite-first contract guarantees that no user input is ever lost, even if the app is killed mid-workout. This is the foundational differentiator.
- **Acceptance criteria:**
  - Every set logged writes to SQLite before the UI animates confirmation
  - A workout can be started, progressed, and completed with airplane mode on from start to finish
  - Killing the app process mid-workout and relaunching recovers all previously saved sets
  - SQLite uses WAL mode with `busy_timeout=2000` and `synchronous=NORMAL`
  - UI components never call `fetch` directly; all reads come from SQLite via Drizzle
  - Write latency from tap to SQLite commit is under 50ms on a mid-range device
- **Dependencies:** `feat-033` (Clerk auth for user identity), `feat-008` (MMKV for in-progress snapshot)
- **Notes:** This is the non-negotiable rule "Never lose a user input" implemented as a feature. The MMKV snapshot (feat-008) provides the crash-recovery layer on top of this.

---

## feat-002 -- Sync via PowerSync with Sync Streams

- **ID:** `feat-002`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** data-sync-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** Background bidirectional sync between on-device SQLite and Supabase Postgres via PowerSync Sync Streams (beta), replacing legacy Sync Rules YAML.
- **Rationale:** PowerSync was chosen over WatermelonDB (see ADR 0002) for its mature conflict resolution, Supabase-native integration, and Sync Streams beta which eliminates the fragile YAML config. Background reconciliation means the user never waits for sync and never sees a loading spinner during a workout.
- **Acceptance criteria:**
  - Data written offline syncs to Supabase Postgres within 30 seconds of connectivity restoration
  - Sync uses Sync Streams configuration, NOT legacy Sync Rules YAML
  - PowerSync verifies Clerk-issued JWTs directly via Clerk's JWKS endpoint
  - Conflict resolution follows last-write-wins at the row level with timestamp-based ordering
  - Sync does not block the UI thread
  - Sync queue persists across app restarts
- **Dependencies:** `feat-001` (local SQLite writes to sync), `feat-033` (Clerk JWT for PowerSync auth)
- **Notes:** PowerSync Sync Streams is in beta as of May 2026. Monitor for GA release. Drizzle ORM is used on both client (SQLite) and server (Postgres) sides per ADR 0003.

---

## feat-003 -- Three User Types via Clerk Organizations

- **ID:** `feat-003`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** system-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Sign-up flow captures user type (Lifter, Trainer, Gym Operator) and maps each to a Clerk Organization, enabling role-based feature gating from the first migration.
- **Rationale:** The three-user model is baked into the product from day one so the database schema, RLS policies, and navigation structure never need a retrofit. Competitors like Hevy bolted on trainer features late, resulting in a fragmented experience. Clerk Organizations provide the grouping primitive natively.
- **Acceptance criteria:**
  - Onboarding flow presents a user-type selector (Lifter / Trainer / Gym Operator)
  - Selected type is persisted as a Clerk Organization membership
  - Database schema includes `user_type` or equivalent column from the first migration
  - RLS policies reference user type for feature gating
  - Trainer and Gym features are stubbed but not active in v0
  - User type can be changed later (needs decision on migration path)
- **Dependencies:** `feat-033` (Clerk authentication)
- **Notes:** Trainer features (feat-020) and Gym features (feat-021) are stubbed in v0, active in v1 and v2 respectively. (Needs decision) -- can a user hold multiple types simultaneously (e.g., a trainer who also logs personal workouts)?

---

## feat-004 -- Pre-Loaded Exercise Catalog

- **ID:** `feat-004`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** A curated "Core 50" exercise catalog bundled into the app at build time, with full ExerciseDB sync available via server-side refresh in later phases.
- **Rationale:** Users must be able to log a workout immediately after install without waiting for a network fetch. The Core 50 covers the exercises that account for ~90% of gym sessions (bench press, squat, deadlift, overhead press, rows, curls, etc.). ExerciseDB was chosen over Wger (see ADR 0001) for its richer metadata and image quality.
- **Acceptance criteria:**
  - App ships with `data/exercises/seed-2026.json` containing at least 50 exercises
  - Each exercise has: name, primary/secondary muscle groups, equipment required, category, and instructions
  - Catalog data is read-only for end users (second data pillar -- catalog data)
  - Exercises render immediately on first launch with no network call
  - Full ExerciseDB sync happens only server-side via Supabase Edge Function; API key never reaches the device
  - Catalog refresh cadence is quarterly (needs decision on push mechanism)
- **Dependencies:** None (foundational)
- **Notes:** ExerciseDB API key must be stored in Supabase secrets manager, never bundled in the app. The seed JSON is generated from ExerciseDB data and committed to the repo.

---

## feat-005 -- Equipment-Based Exercise Filter

- **ID:** `feat-005`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v0`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** A "My Gym" toggle that filters the exercise catalog to show only exercises performable with the equipment the user has marked as available.
- **Rationale:** Home gym users and travelers are frustrated when shown exercises requiring equipment they do not have. Competitor apps (JEFIT, Fitbod) offer equipment filtering, but it is buried in settings. The "My Gym" toggle is a first-class UI element.
- **Acceptance criteria:**
  - User can mark equipment as available in a "My Gym" settings screen
  - Equipment list is derived from the exercise catalog's equipment field
  - When "My Gym" toggle is active, exercise search/browse shows only matching exercises
  - Toggle state persists locally and syncs via PowerSync
  - Default state is "all equipment available" (no filtering)
  - Filter applies in both exercise search and routine builder
- **Dependencies:** `feat-004` (exercise catalog with equipment metadata)
- **Notes:** The equipment list in v0 is derived from the Core 50 seed. As the catalog grows, equipment taxonomy may need a dedicated table.

---

## feat-006 -- Custom Exercises

- **ID:** `feat-006`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v0`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** Users can create their own exercises with custom names, muscle group tags, and equipment assignments, scoped exclusively to the creating user.
- **Rationale:** No catalog is complete. Power users always have specialty movements (e.g., "Meadows Row," "JM Press") or gym-specific machine exercises. Custom exercises are user data (first data pillar), protected by RLS, and synced via PowerSync.
- **Acceptance criteria:**
  - User can create an exercise with: name, primary muscle group, optional secondary muscle groups, equipment, and category
  - Custom exercises appear alongside catalog exercises in search and browse
  - Custom exercises are visually distinguishable from catalog exercises (badge or icon)
  - Custom exercises are scoped to the creator via RLS; no other user can see them
  - Custom exercises sync via PowerSync
  - Custom exercises can be used in routines (feat-007) and workout logging (feat-001)
- **Dependencies:** `feat-004` (catalog schema that custom exercises extend), `feat-001` (local-first write)
- **Notes:** (Needs decision) -- can trainers share custom exercises with their clients, or is that deferred to feat-020?

---

## feat-007 -- Custom Routines

- **ID:** `feat-007`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v0`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** Users can create reusable workout templates (routines) consisting of ordered exercises with target sets, reps, and rest periods, then launch a workout session from any routine.
- **Rationale:** Routines are the core "plan" abstraction. Every competitor has them. The differentiator is that routines are local-first, instantly launchable offline, and pre-fillable via QR code (feat-009). Routines are user data (first data pillar).
- **Acceptance criteria:**
  - User can create a routine with: name, ordered list of exercises, target sets/reps per exercise, and rest period per exercise
  - Routines are stored locally in SQLite and synced via PowerSync
  - User can start a workout session from a routine, which pre-fills the exercise list and targets
  - Routines can include both catalog and custom exercises
  - Routines are editable and deletable
  - Routines are scoped to the creator via RLS
  - Schema includes `visibility`, `is_shareable`, and `origin_id` columns from v0 (feat-027)
- **Dependencies:** `feat-004` (exercise catalog), `feat-006` (custom exercises), `feat-001` (local-first write), `feat-027` (sharing seam columns)
- **Notes:** Trainer-assigned routines (feat-020) and public routine library (feat-029) build on this schema later.

---

## feat-008 -- Workout-Session Screen-State Preservation via MMKV

- **ID:** `feat-008`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** mobile-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** The active workout session state is continuously snapshot to MMKV (synchronous, ~30x faster than AsyncStorage) so that backgrounding, screen lock, phone calls, or process kills never lose in-progress data.
- **Rationale:** "The screen state is sacred" is a non-negotiable rule. Competitor apps (especially Strong and JEFIT) have documented issues where backgrounding during a long rest period causes the app to reload from scratch, losing the current workout. MMKV's synchronous writes guarantee the snapshot is always current.
- **Acceptance criteria:**
  - Active workout state (current exercise, completed sets, timer state, scroll position) is written to MMKV on every state change
  - MMKV write is synchronous and completes before the state change callback returns
  - On app launch, if an MMKV snapshot exists, the workout screen resumes with full state
  - MMKV snapshot is flushed to SQLite on every state change as a secondary persistence layer
  - Backgrounding the app for any duration (minutes, hours) preserves state
  - Force-killing the app process and relaunching recovers the workout from the MMKV/SQLite snapshot
  - MMKV snapshot is cleared only when a workout is explicitly completed or discarded
- **Dependencies:** `feat-001` (SQLite as the durable backup for the MMKV snapshot)
- **Notes:** MMKV is also used for Zustand persistence and TanStack Query cache persistence. This feature is specifically about the workout-session snapshot contract.

---

## feat-009 -- QR Code Scan-to-Prefill Workflow

- **ID:** `feat-009`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v1`
- **Owner agent:** qr-and-deeplink-specialist
- **Source:** Initial product scoping, May 2026
- **One-line description:** Users scan a QR code on gym equipment to deep-link into the app with the corresponding exercise pre-selected and last-used settings pre-filled, using signed JWT tokens for parameter integrity.
- **Rationale:** The scan-to-log flow reduces the "find exercise, configure weight, start set" loop from 5+ taps to 1 scan + 1 tap. This is a gym-operator partnership feature and a key differentiator over Hevy/Strong. QR codes use `gymapp://` custom scheme and HTTPS universal links.
- **Acceptance criteria:**
  - Scanning a QR code opens the app (or prompts install) with the exercise pre-selected
  - QR payload is a signed JWT; the app validates the signature before pre-filling any fields
  - Invalid or expired JWTs show a clear error and do not pre-fill
  - Deep link supports both `gymapp://` custom scheme and HTTPS universal links
  - Works with Expo Camera + QR scanner package
  - Pre-fill includes exercise selection and optionally equipment/machine identifier
- **Dependencies:** `feat-004` (exercise catalog to resolve exercise ID from QR), `feat-033` (Clerk for JWT verification infrastructure), `feat-024` (optimistic prefill enhancement)
- **Notes:** The domain for HTTPS universal links is TBD. JWT signing key management needs a decision -- likely a dedicated key pair separate from Clerk auth tokens.

---

## feat-010 -- Push Notifications

- **ID:** `feat-010`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v1`
- **Owner agent:** notifications-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** Local notifications for rest timer alerts and remote push notifications for trainer messages and social interactions, delivered via Expo Notifications.
- **Rationale:** Rest timer notifications are essential during workouts when the phone is locked or another app is in the foreground. Remote pushes enable the trainer-client communication loop and future social features.
- **Acceptance criteria:**
  - Local notifications fire when rest timer completes, even when app is backgrounded
  - Remote push notifications can be sent from the server (trainer invites, workout reminders)
  - Notification permissions are requested at a contextually appropriate moment, not on first launch
  - Push tokens are stored securely and synced to the server
  - Notifications are delivered via Expo Notifications (expo-notifications)
  - Users can configure notification preferences (which types to receive)
- **Dependencies:** `feat-033` (Clerk auth for user identity to associate push tokens)
- **Notes:** Remote push requires server-side infrastructure (worker or Edge Function) to send. Trainer-specific notifications depend on feat-020.

---

## feat-011 -- Live Activities and Dynamic Island (iOS Rest Timer)

- **ID:** `feat-011`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v1`
- **Owner agent:** notifications-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** The rest timer between sets is displayed as an iOS Live Activity on the lock screen and in the Dynamic Island, allowing users to track rest without unlocking or switching apps.
- **Rationale:** This is a premium UX differentiator. No major competitor uses Live Activities for rest timers as of 2026. It solves the "I have to unlock my phone to check my rest timer" friction point, which is especially painful with sweaty/chalky hands.
- **Acceptance criteria:**
  - Rest timer appears as a Live Activity on the iOS lock screen
  - Rest timer appears in the Dynamic Island (compact and expanded views)
  - Timer updates in real time without app foregrounding
  - Tapping the Live Activity / Dynamic Island opens the app to the current workout
  - Live Activity is dismissed when the next set begins or the timer is cancelled
  - Implemented via `expo-live-activity` package
  - Graceful degradation on devices without Dynamic Island (Live Activity only)
  - Android does not show Live Activity (iOS-only feature); rest timer uses standard notification on Android
- **Dependencies:** `feat-010` (notification infrastructure), `feat-012` (haptic feedback on timer completion)
- **Notes:** Live Activities require a Widget Extension target in the Xcode project, which must be configured via EAS Build. This is an iOS-only feature with no Android equivalent.

---

## feat-012 -- Haptic Feedback on Set Completion

- **ID:** `feat-012`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v0`
- **Owner agent:** ux-flow-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** A satisfying haptic pulse fires when a user completes a set, providing tactile confirmation that the input was registered without requiring visual attention.
- **Rationale:** Mid-workout, users are fatigued and often not looking directly at the screen. A haptic pulse provides unmistakable confirmation that the set was logged, reducing anxiety about lost data. This is part of the "sensitivity to high-fatigue UX" philosophy (feat-019).
- **Acceptance criteria:**
  - Haptic feedback fires on set completion (Expo Haptics `notificationAsync` with success type)
  - Haptic feedback fires on workout completion (stronger haptic pattern)
  - Haptics can be disabled in settings
  - Haptic pattern is distinct from system haptics (custom pattern if possible)
  - Works on both iOS and Android via Expo Haptics
- **Dependencies:** None (Expo Haptics is a standalone module)
- **Notes:** Additional haptic integration in feat-023 (stepped numeric input) and feat-011 (rest timer completion).

---

## feat-013 -- Personal Record Detection

- **ID:** `feat-013`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v1`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** Automatic detection and celebration of personal records across three categories: estimated 1RM, total volume (sets x reps x weight), and max reps at a given weight.
- **Rationale:** PR detection is the #1 motivational feature in fitness apps. Hevy and Strong both have it but their detection is limited to 1RM. Tracking volume PRs and max-reps-at-weight PRs provides a more complete picture of progress, especially for hypertrophy-focused lifters.
- **Acceptance criteria:**
  - 1RM PR is calculated using a standard formula (Epley or Brzycki -- needs decision) after each set
  - Volume PR is calculated per exercise per session (total weight moved)
  - Max-reps-at-weight PR is tracked per exercise (e.g., "new record: 10 reps at 100kg")
  - PR detection runs locally against SQLite history, not requiring network
  - PRs are visually celebrated in the UI (animation + haptic)
  - PR history is viewable per exercise
  - Schema includes `visibility` and `is_shareable` columns (feat-027) for future sharing
- **Dependencies:** `feat-001` (workout history in SQLite), `feat-015` (unit system for weight comparison), `feat-014` (bodyweight for bodyweight-exercise PRs)
- **Notes:** (Needs decision) -- which 1RM formula to use (Epley vs Brzycki vs user-selectable). Pure computation logic lives in `packages/fitness-logic/`.

---

## feat-014 -- Bodyweight Tracking Integrated with Bodyweight Exercises

- **ID:** `feat-014`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v0`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** Users log their body weight, and bodyweight-loaded exercises (pull-ups, dips, weighted chin-ups) automatically capture the user's current body weight at the time of the set for accurate progressive overload tracking.
- **Rationale:** A lifter who gains 5kg of body weight is lifting 5kg more on every pull-up rep, but no competitor app tracks this. Without bodyweight context, a user who goes from 10 pull-ups at 70kg to 10 pull-ups at 80kg appears to have made zero progress, when in reality they have made massive strength gains.
- **Acceptance criteria:**
  - User can log body weight (with date and unit)
  - Bodyweight-loaded exercises (flagged in the exercise catalog) automatically attach the most recent body weight to each set
  - If no body weight is recorded, the app prompts the user to enter it (non-blocking)
  - Progressive overload calculations for bodyweight exercises factor in body weight
  - Body weight history is stored locally and synced via PowerSync
  - Body weight is a `{ value: number; unit: 'kg' | 'lb' }` type (feat-015)
  - Schema includes `external_sync_id` and `sync_source` columns for future HealthKit/Health Connect integration
- **Dependencies:** `feat-001` (local-first write), `feat-004` (exercise catalog with bodyweight flag), `feat-015` (unit system)
- **Notes:** Bodyweight auto-attach uses the most recent logged weight. (Needs decision) -- should the app prompt for body weight at the start of each workout, or only when it is stale (e.g., older than 7 days)?

---

## feat-015 -- Dual Unit System (kg / lb) with Per-Exercise Override

- **ID:** `feat-015`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** Users choose a default unit (kg or lb) during onboarding, but every individual exercise can override the default, supporting lifters who bench in lb but squat in kg.
- **Rationale:** International lifters and competitive powerlifters frequently mix units. Every competitor app forces a global setting. The per-exercise override is a subtle power-user feature that earns loyalty.
- **Acceptance criteria:**
  - Onboarding flow includes unit preference selection (kg or lb)
  - Default unit is applied to all exercises unless overridden
  - Any exercise can have its unit overridden in the exercise detail or during logging
  - Weight values are always stored as `{ value: number; unit: 'kg' | 'lb' }` -- never bare numbers
  - Conversion between kg and lb is available but does not auto-convert stored values
  - Unit override persists per user per exercise and syncs via PowerSync
  - All weight displays respect the active unit for that exercise
- **Dependencies:** None (foundational type system)
- **Notes:** The `Weight` type is defined in `packages/domain/` and enforced by TypeScript strict mode. Distance values (for cardio) will follow the same pattern with `km | mi` when cardio features are added.

---

## feat-016 -- Apple Health Integration

- **ID:** `feat-016`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v2`
- **Owner agent:** health-integration-specialist
- **Source:** Initial product scoping, May 2026
- **One-line description:** Bidirectional sync of workout data and body measurements with Apple HealthKit on iOS, behind a dedicated health-data consent flow separate from general app permissions.
- **Rationale:** HealthKit integration is a table-stakes feature for iOS fitness apps and a factor in App Store featuring. It also enables data portability and interoperability with Apple Watch, other fitness apps, and the Apple Health dashboard.
- **Acceptance criteria:**
  - Workout summaries (exercise type, duration, calories if available) are written to HealthKit
  - Body weight measurements are synced bidirectionally with HealthKit
  - Health data consent is a separate, explicit opt-in flow (MHMDA/GDPR compliant -- feat-025)
  - Deduplication logic prevents double-counting when data exists in both systems
  - Schema includes `external_sync_id` and `sync_source` columns from v0 (ready before feature ships)
  - Integration uses a single internal abstraction shared with Health Connect (feat-017)
  - Graceful handling when HealthKit access is denied or revoked
- **Dependencies:** `feat-001` (workout data to sync), `feat-014` (body weight data), `feat-025` (health-data consent flow)
- **Notes:** Schema columns (`external_sync_id`, `sync_source`) are added in v0 even though this feature ships in v2. Implementation is behind a feature flag. Phase 2 target.

---

## feat-017 -- Health Connect Integration

- **ID:** `feat-017`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v2`
- **Owner agent:** health-integration-specialist
- **Source:** Initial product scoping, May 2026
- **One-line description:** Bidirectional sync of workout data and body measurements with Health Connect on Android, behind the same health-data consent flow as Apple Health.
- **Rationale:** Health Connect is the Android equivalent of HealthKit. Parity with iOS integration is required for the "Android-parity-from-day-one" principle, even though the feature ships in Phase 2.
- **Acceptance criteria:**
  - Workout summaries are written to Health Connect
  - Body weight measurements are synced bidirectionally with Health Connect
  - Health data consent is a separate, explicit opt-in flow (MHMDA/GDPR compliant -- feat-025)
  - Deduplication logic prevents double-counting
  - Schema includes `external_sync_id` and `sync_source` columns from v0
  - Integration uses the same internal abstraction as Apple Health (feat-016)
  - Graceful handling when Health Connect access is denied or unavailable
- **Dependencies:** `feat-001` (workout data to sync), `feat-014` (body weight data), `feat-025` (health-data consent flow)
- **Notes:** Health Connect availability varies by Android version and OEM. Must handle devices where Health Connect is not installed. Ships alongside feat-016 in Phase 2.

---

## feat-018 -- Mux Video Streaming for Exercise Demos

- **ID:** `feat-018`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v1`
- **Owner agent:** backend-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** Exercise demonstration videos are hosted on Mux and delivered via adaptive bitrate streaming, with offline caching support for routines downloaded ahead of a gym session.
- **Rationale:** Video demos are essential for exercise form guidance, especially for beginners. Mux provides adaptive bitrate streaming (adjusts quality to connection speed), which is critical in gyms with poor Wi-Fi. The offline caching capability (via expo-video-cache) supports the "never block on network" principle.
- **Acceptance criteria:**
  - Exercise demo videos are hosted on Mux with adaptive bitrate streaming
  - Video playback uses `expo-video` player
  - iOS supports HLS offline caching via `expo-video-cache`
  - Mux API key is server-side only (Supabase Edge Function or worker); never reaches the device
  - Mux signed URLs are generated server-side and delivered to the client
  - Videos load and play without blocking the workout flow
  - Placeholder/thumbnail shown while video loads
- **Dependencies:** `feat-004` (exercise catalog entries to attach videos to), `feat-022` (offline pre-cache for routines)
- **Notes:** Video production pipeline (filming, editing, uploading to Mux) is out of scope for this feature. This covers only the technical delivery and playback infrastructure. (Needs decision) -- source of initial video content (stock, licensed, or custom-produced).

---

## feat-019 -- Sensitivity to High-Fatigue UX

- **ID:** `feat-019`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** ux-flow-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Every UI element is designed for use by fatigued, sweaty users mid-workout: large tap targets, high-contrast dark default theme, generous spacing, haptic confirmation, and minimal required precision.
- **Rationale:** Fitness apps are used under conditions that no other app category faces: shaking hands from heavy lifts, sweaty fingers, chalk dust, reduced fine motor control from fatigue. Competitor apps designed for desk use (small buttons, light themes, precise text input) create friction exactly when users are most committed to logging.
- **Acceptance criteria:**
  - All interactive elements have a minimum tap target of 48x48dp (Apple HIG) or larger
  - Default theme is dark mode (OLED-friendly)
  - Critical actions (log set, complete workout) are accessible with one hand
  - No precision text input is required during a workout (feat-023 replaces keyboard with stepped input)
  - Color contrast meets WCAG AA standards
  - Font sizes in workout screens are large enough to read at arm's length
  - Haptic feedback accompanies all confirmatory actions (feat-012)
- **Dependencies:** `feat-012` (haptic feedback), `feat-023` (stepped numeric input)
- **Notes:** This is a design philosophy enforced across all screens, not a single implementation. The ux-flow-architect agent enforces this on every UI review.

---

## feat-020 -- Trainer-Client Linking and Routine Assignment

- **ID:** `feat-020`
- **Status:** `planned`
- **User type:** `trainer`
- **Phase:** `v1`
- **Owner agent:** system-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Trainers can link with client accounts, assign routines to them, view their workout history, and receive notifications when clients complete workouts.
- **Rationale:** The trainer user type is one of three pillars of the product. Trainer-client linking is the foundation for all trainer features: program design, progress monitoring, and communication. This differentiates from Hevy (no trainer features) and competes with Trainerize/TrueCoach.
- **Acceptance criteria:**
  - Trainer can send a link/invite to a client (via Clerk Organizations)
  - Client can accept/decline trainer linking
  - Trainer can view linked clients' workout history (read-only)
  - Trainer can assign routines to linked clients
  - Assigned routines appear in the client's routine list with a "from trainer" badge
  - Client workout completion triggers a notification to the trainer (feat-010)
  - Unlinking removes trainer access but does not delete client data
  - RLS policies enforce that trainers can only see data for their linked clients
- **Dependencies:** `feat-003` (user types), `feat-007` (routines to assign), `feat-010` (notifications), `feat-033` (Clerk for organizational linking)
- **Notes:** Database schema includes trainer-client relationship table from v0 (stubbed). Full feature active in v1. (Needs decision) -- maximum number of clients per trainer on free vs. paid tiers (RevenueCat gating via feat-034).

---

## feat-021 -- Gym Operator Dashboard

- **ID:** `feat-021`
- **Status:** `planned`
- **User type:** `gym`
- **Phase:** `v2`
- **Owner agent:** system-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Gym operators can view aggregate equipment usage, member activity trends, and manage QR codes placed on their equipment, all via a dedicated dashboard view.
- **Rationale:** Gym operators are the third user type. Their value proposition is data-driven equipment purchasing, layout optimization, and member engagement tracking. This creates a B2B revenue channel independent of individual subscriptions.
- **Acceptance criteria:**
  - Gym operator dashboard shows aggregate equipment usage statistics
  - Dashboard shows member activity trends (workouts per week, popular times)
  - Gym operator can generate and manage QR codes for their equipment
  - All aggregate data uses server-paginated queries, NOT PowerSync (feat-028)
  - Individual member data is anonymized/aggregated unless the member opts in
  - Dashboard is accessible only to users with the gym operator type
  - RLS policies enforce gym operator access boundaries
- **Dependencies:** `feat-003` (user types), `feat-009` (QR code infrastructure), `feat-028` (two-speed data architecture for aggregate queries)
- **Notes:** This is a v2 feature. Schema includes gym entity tables from v0 (stubbed). (Needs decision) -- web dashboard vs. in-app dashboard vs. both.

---

## feat-022 -- Pre-Cache Routine for Offline

- **ID:** `feat-022`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v1`
- **Owner agent:** mobile-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Users can explicitly download all data for a routine (exercise details, video demos, last-used weights) for guaranteed offline use, with an eviction policy to manage storage.
- **Rationale:** Basement gyms, rural gyms, and gym floors with concrete walls all have dead spots. The "Download for offline" button gives users confidence that their workout will not be interrupted by connectivity issues. This is the "never block on network" principle applied proactively.
- **Acceptance criteria:**
  - User can tap "Download for offline" on any routine
  - Download includes: exercise metadata, demo videos (via Mux HLS cache), and last-used weights/settings
  - Download progress is shown with a progress indicator
  - Downloaded routines are marked with an offline-available badge
  - Eviction policy removes oldest cached routines when storage exceeds a threshold (needs decision on threshold)
  - Downloaded content is usable with no network connectivity
  - User can manually remove downloaded content
- **Dependencies:** `feat-007` (routines to download), `feat-018` (Mux video content to cache)
- **Notes:** iOS HLS offline caching is supported via `expo-video-cache`. Android video offline caching solution needs investigation (needs decision). Storage threshold for eviction TBD.

---

## feat-023 -- Stepped Numeric Input with Haptic Increments

- **ID:** `feat-023`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v0`
- **Owner agent:** ux-flow-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** A custom numeric input control that replaces the keyboard for weight and rep entry during workouts, using large +/- buttons with configurable step sizes and haptic feedback on each increment.
- **Rationale:** Typing numbers on a phone keyboard mid-workout is error-prone and slow. Sweaty fingers miss small keys. The stepped input provides large tap targets, reduces errors, and the haptic feedback on each increment provides tactile confirmation of the value change without requiring visual attention.
- **Acceptance criteria:**
  - Weight input uses +/- buttons instead of a keyboard
  - Step size is configurable (e.g., 2.5kg, 5lb, 1kg, 1lb)
  - Step size defaults to the most common plate increment for the user's unit system
  - Each increment/decrement triggers a haptic pulse
  - Long-press accelerates the increment rate
  - Current value is displayed in a large, readable font
  - User can tap the value to switch to keyboard input for precise entry
  - Rep input uses the same control with step size of 1
- **Dependencies:** `feat-012` (haptic feedback), `feat-015` (unit system for step size defaults)
- **Notes:** Gesture Handler and Reanimated may be needed for the long-press acceleration behavior. The input must be accessible (VoiceOver/TalkBack compatible).

---

## feat-024 -- Optimistic Prefill on QR-Code Landing

- **ID:** `feat-024`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v1`
- **Owner agent:** qr-and-deeplink-specialist
- **Source:** Initial product scoping, May 2026
- **One-line description:** When a user scans a QR code on a machine, the app instantly renders the exercise screen with the user's last-used weight and reps on that specific machine, providing a zero-configuration workout start.
- **Rationale:** The QR scan (feat-009) gets the user to the right exercise. The optimistic prefill goes further: it pre-populates the exact weight and reps from the user's last session on that machine, so the user can start their first set with zero input. This is the "under two taps" promise realized.
- **Acceptance criteria:**
  - After QR scan, the app queries local SQLite for the user's last workout on the scanned exercise/machine
  - Last-used weight, reps, and sets are pre-filled into the workout screen
  - Prefill renders instantly from local data (no network call)
  - If no history exists for this exercise/machine, sensible defaults are shown (needs decision)
  - Prefilled values are editable before confirming the set
  - Machine identifier from the QR code is stored with the workout data for future prefills
- **Dependencies:** `feat-009` (QR code scanning), `feat-001` (workout history in SQLite)
- **Notes:** The "last set on this machine" query requires that workout sets store a machine identifier. Schema must include an optional `machine_id` or `equipment_instance_id` column.

---

## feat-025 -- MHMDA / GDPR / CCPA Compliance Flow

- **ID:** `feat-025`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** security-guardian
- **Source:** Initial product scoping, May 2026
- **One-line description:** A compliance framework covering health-data consent (separate from general terms), in-app data deletion, and JSON data export, satisfying MHMDA, GDPR, and CCPA requirements.
- **Rationale:** Health and fitness data is subject to specialized regulation beyond standard privacy laws. MHMDA (Mental Health and Modernization Data Act) and similar laws require explicit, separate consent for health data collection. GDPR and CCPA require data portability and deletion. Non-compliance risks App Store rejection and legal liability.
- **Acceptance criteria:**
  - Health-data consent is a separate opt-in flow, distinct from general terms of service
  - Users can view what health data is collected and how it is used
  - Users can request full account deletion from within the app (Apple requirement)
  - Account deletion removes all user data from Supabase within 30 days (configurable)
  - Users can export all their data as a JSON file
  - Consent records are stored and auditable
  - Compliance flow is presented during onboarding and accessible from settings
- **Dependencies:** `feat-033` (Clerk auth for user identity)
- **Notes:** Legal review of consent language is required before launch. (Needs decision) -- whether to use a third-party consent management platform or build in-house. The deletion flow must cascade through all tables and Supabase Storage objects.

---

## feat-026 -- App Review Submission Positioning

- **ID:** `feat-026`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** fitness-domain-expert
- **Source:** Initial product scoping, May 2026
- **One-line description:** App Store and Play Store submission metadata explicitly positions the app as "Health and Fitness, not Medical," with language and disclaimers that prevent App Review rejection.
- **Rationale:** Apple and Google reject fitness apps that appear to make medical claims. Careful positioning in the app description, screenshots, and in-app language ensures smooth review. The app tracks workouts and progress but does not diagnose, treat, or prescribe.
- **Acceptance criteria:**
  - App Store description includes a clear "not medical advice" disclaimer
  - No in-app language makes medical claims or diagnoses
  - App category is set to "Health & Fitness" (not "Medical")
  - Privacy nutrition labels are accurate and complete
  - App Review submission notes explain the health data handling approach
  - HealthKit/Health Connect usage descriptions are clear and honest
- **Dependencies:** `feat-025` (compliance flow referenced in submission)
- **Notes:** This is a process/content deliverable, not a code feature. The fitness-domain-expert owns the language. Must be reviewed before every App Store submission.

---

## feat-027 -- Three-Column Sharing Seam

- **ID:** `feat-027`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** data-sync-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** Every shareable entity (workouts, routines, exercises, PRs) includes three schema columns from v0 -- `visibility` enum, `is_shareable` boolean, and `origin_id` UUID -- so that future sharing features are a policy migration, not a schema rewrite.
- **Rationale:** The "private-by-default, with sharing-shaped seams" principle. v1 ships with no public sharing, but the schema is ready for it. Adding sharing later becomes a matter of flipping `visibility` values and adding UI, not running ALTER TABLE on millions of rows.
- **Acceptance criteria:**
  - `visibility` column (enum: `private`, `friends`, `public`) exists on all shareable entity tables
  - `is_shareable` column (boolean, default false) exists on all shareable entity tables
  - `origin_id` column (UUID, nullable) exists on all shareable entity tables for tracking cloned/shared content
  - Default values are `private` / `false` / `null` -- no data is shared in v0
  - RLS policies respect `visibility` even though only `private` is used in v0
  - Columns are included in PowerSync sync schema
  - No UI surfaces these columns in v0
- **Dependencies:** None (foundational schema design)
- **Notes:** The `origin_id` enables tracking lineage when routines are cloned (feat-029) or PRs are shared (feat-032). These features are deferred but the schema supports them.

---

## feat-028 -- Two-Speed Data Architecture Rule

- **ID:** `feat-028`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** data-sync-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** An architectural rule enforced by the data-sync-engineer agent: personal data uses PowerSync local-first sync, while aggregate/feed/social data uses server-paginated queries -- never PowerSync.
- **Rationale:** The worst class of bug in social fitness apps is syncing aggregate data (leaderboards, feeds, public profiles) through the same local-first pipeline as personal data. This causes unbounded local database growth, sync conflicts on data the user does not own, and privacy leaks. The two-speed rule prevents this entire category of bugs.
- **Acceptance criteria:**
  - All personal data (workouts, sets, body weight, custom exercises, routines) syncs via PowerSync
  - All aggregate data (leaderboards, feeds, gym dashboards) uses server-paginated API calls
  - The data-sync-engineer agent rejects any PR that routes aggregate data through PowerSync
  - TanStack Query is used for server-paginated data caching
  - The distinction is documented in the architecture docs
  - No PowerSync sync schema includes tables intended for aggregate/social data
- **Dependencies:** None (architectural rule)
- **Notes:** This rule is enforced from v0 even though aggregate features (feed, leaderboards) are deferred to future phases. The enforcement prevents tech debt accumulation.

---

## feat-029 -- Public Routine Library and Cloning

- **ID:** `feat-029`
- **Status:** `idea`
- **User type:** `all`
- **Phase:** `future`
- **Owner agent:** system-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** A server-side browsable library of public routines that users can clone into their own accounts, with attribution tracking via the `origin_id` column.
- **Rationale:** Public routine sharing is a growth feature -- it brings new users in via shared links and reduces the cold-start problem for beginners who do not know what routine to follow. DEFERRED because it requires the two-speed data architecture (feat-028) and the sharing seam (feat-027) to be in place, and the social features need careful product design.
- **Acceptance criteria:**
  - Users can publish routines to a public library (visibility = public)
  - Public routines are browsable and searchable via server-paginated queries (not PowerSync)
  - Users can clone a public routine into their own account
  - Cloned routines carry `origin_id` referencing the source routine
  - Original author receives attribution (visible in the cloned routine)
  - Cloned routines are independently editable by the cloner
- **Dependencies:** `feat-007` (routines), `feat-027` (sharing seam), `feat-028` (two-speed architecture)
- **Notes:** DEFERRED to future phase. See idea-log for full discussion. Moderation strategy for public routines needs design.

---

## feat-030 -- Friends-Only Social Feed

- **ID:** `feat-030`
- **Status:** `idea`
- **User type:** `lifter`
- **Phase:** `future`
- **Owner agent:** system-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** A social feed showing workout summaries and PRs from accepted friends, using server-paginated queries and the friends visibility tier.
- **Rationale:** Social accountability is a proven retention driver in fitness apps. A friends-only feed (not public) balances social motivation with privacy. DEFERRED because social features require careful design to avoid the pitfalls seen in Hevy (public-by-default backlash).
- **Acceptance criteria:**
  - Users can send/accept friend requests
  - Friends feed shows workout summaries and PRs from accepted friends
  - Feed uses server-paginated queries, NOT PowerSync (feat-028)
  - Users control what appears in their friends' feeds via visibility settings
  - Feed supports reactions (like, celebrate) but not comments in v1
  - Data shown in the feed is the friends-visibility tier of the sharing seam (feat-027)
- **Dependencies:** `feat-027` (sharing seam), `feat-028` (two-speed architecture), `feat-013` (PRs to share)
- **Notes:** DEFERRED to future phase. See idea-log. Friend model (mutual vs. follow) needs product decision.

---

## feat-031 -- Public Profile Pages

- **ID:** `feat-031`
- **Status:** `idea`
- **User type:** `all`
- **Phase:** `future`
- **Owner agent:** system-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Optional public profile pages displaying a user's workout statistics, PR history, and shared routines, accessible via a shareable URL.
- **Rationale:** Public profiles serve as a growth channel (shareable on social media) and a credibility mechanism for trainers. DEFERRED because it requires the sharing seam, aggregate data architecture, and a moderation strategy.
- **Acceptance criteria:**
  - Users can opt in to a public profile
  - Public profile shows selected workout stats, PR history, and published routines
  - Profile is accessible via a shareable URL (web rendering or deep link)
  - All displayed data is explicitly opted in by the user (not default-public)
  - Profile uses server-paginated queries for rendering
  - Trainers can use their profile as a portfolio
- **Dependencies:** `feat-027` (sharing seam), `feat-028` (two-speed architecture), `feat-013` (PR data), `feat-029` (public routines)
- **Notes:** DEFERRED to future phase. See idea-log. Requires a web rendering surface (landing page or web app) for URL sharing.

---

## feat-032 -- Per-PR Share Link

- **ID:** `feat-032`
- **Status:** `idea`
- **User type:** `lifter`
- **Phase:** `future`
- **Owner agent:** system-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Individual personal records can be shared via a unique link, gated by the `is_shareable` column on the PR record.
- **Rationale:** Sharing a PR moment (e.g., "New bench press 1RM: 140kg!") is a powerful viral growth mechanism. Each shared PR becomes a mini-landing page that links back to the app. DEFERRED until the sharing infrastructure is proven.
- **Acceptance criteria:**
  - User can generate a share link for any PR
  - Share link generates a preview card (Open Graph metadata) for social media
  - Clicking the link opens the app (or app store) with the PR displayed
  - Sharing is gated by `is_shareable` column (feat-027)
  - User can revoke a share link
  - Shared PR page does not reveal information the user has not explicitly shared
- **Dependencies:** `feat-013` (PR detection), `feat-027` (sharing seam), `feat-009` (deep link infrastructure)
- **Notes:** DEFERRED to future phase. See idea-log. Requires a web rendering surface for the share link preview.

---

## feat-033 -- Clerk Authentication with Native Apple/Google/Passkeys

- **ID:** `feat-033`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** security-guardian
- **Source:** Initial product scoping, May 2026
- **One-line description:** Authentication via Clerk as the identity provider, supporting native Apple Sign-In, Google Sign-In, and passkeys, with Clerk configured as a Supabase third-party auth provider.
- **Rationale:** Clerk provides a managed auth solution with native SDKs for React Native, eliminating the need to build auth UI or manage token refresh logic. Clerk-as-IdP for Supabase means a single identity system across the mobile app, Edge Functions, and PowerSync. Passkeys are the future of auth and Clerk supports them natively.
- **Acceptance criteria:**
  - Users can sign up and log in via Apple Sign-In (iOS native flow)
  - Users can sign up and log in via Google Sign-In (native flow on both platforms)
  - Passkey support is available (needs decision on v0 vs v1 priority)
  - Clerk issues JWTs that Supabase accepts as third-party auth
  - PowerSync verifies Clerk JWTs via Clerk's JWKS endpoint
  - Token refresh is handled automatically by the Clerk SDK
  - User type selection (feat-003) happens during the Clerk onboarding flow
  - Session tokens use RS256 or ES256 signing (no HS256)
  - JWT access token lifetime is 15 minutes or less
- **Dependencies:** None (foundational)
- **Notes:** Clerk secret keys must be stored in environment variables or secret manager, never hardcoded. The Supabase JWT secret must be configured to trust Clerk's JWKS. Email/password auth is intentionally omitted in favor of social + passkey.

---

## feat-034 -- RevenueCat Subscription with Supabase Entitlements Mirror

- **ID:** `feat-034`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** backend-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** Subscription management via RevenueCat from day one, with server-side entitlements mirrored to a Supabase `entitlements` table via webhook so that feature gating can be checked locally and enforced server-side.
- **Rationale:** RevenueCat handles the complexity of App Store and Play Store subscription management (receipt validation, grace periods, billing retry). The entitlements mirror in Supabase enables local-first feature gating (the app can check subscription status from SQLite without a network call) and server-side enforcement via RLS.
- **Acceptance criteria:**
  - RevenueCat SDK is integrated in the mobile app
  - Subscription products are configured in App Store Connect and Google Play Console
  - RevenueCat webhook sends entitlement changes to a Supabase Edge Function
  - Edge Function writes entitlement status to an `entitlements` table in Supabase
  - Entitlements table syncs to the device via PowerSync
  - Feature gating checks can be performed locally against SQLite
  - Free tier includes core workout logging; premium tier unlocks (needs decision on feature split)
  - RevenueCat secret API key is server-side only
- **Dependencies:** `feat-033` (Clerk auth for user identity to link with RevenueCat)
- **Notes:** Free tier covers up to $10K MTR on RevenueCat. Superwall layering is deferred until ~$25K MTR. (Needs decision) -- exact feature split between free and premium tiers.

---

## feat-035 -- PostHog Analytics + Feature Flags + Session Replay

- **ID:** `feat-035`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** mobile-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** PostHog provides analytics, feature flags, session replay, and A/B experiments in a single tool, hosted in the EU region, free up to 1M events per month.
- **Rationale:** A single observability tool reduces integration complexity and provides a unified view of user behavior, feature rollout, and experimentation. PostHog's EU region hosting simplifies GDPR compliance. Feature flags enable gradual rollout of new features and quick kill switches.
- **Acceptance criteria:**
  - PostHog React Native SDK is integrated
  - Core events are tracked: workout started, workout completed, set logged, exercise searched, PR achieved
  - Feature flags are used for gradual rollout of new features
  - Session replay is enabled for debugging user-reported issues
  - PostHog instance is configured in the EU region
  - User identity is linked to Clerk user ID (no PII in event properties without consent)
  - Analytics do not block the UI thread
  - PostHog API key is a publishable key (safe for client-side); project API key is server-side only
- **Dependencies:** `feat-033` (Clerk auth for user identity linking)
- **Notes:** PostHog free tier covers 1M events/month. Monitor usage as user base grows. Session replay should be sampled (not 100% of sessions) to stay within limits.

---

## feat-036 -- Sentry Crash Reporting and UI Profiling

- **ID:** `feat-036`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v0`
- **Owner agent:** mobile-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** Sentry provides crash reporting, performance monitoring, and UI Profiling for both iOS and Android, with Hermes-aware stack traces and New Architecture support.
- **Rationale:** Crash-free rate is a critical metric for App Store ranking and user retention. Sentry's React Native SDK is the most mature option, with specific support for Hermes source maps and the New Architecture (Fabric/TurboModules). UI Profiling helps identify jank in the workout logging flow.
- **Acceptance criteria:**
  - Sentry React Native SDK is integrated with Hermes source map support
  - Crashes are reported with symbolicated stack traces
  - Performance monitoring captures transaction traces for key flows (workout start, set log, sync)
  - UI Profiling is enabled for both iOS and Android
  - Sentry DSN is configured via environment variable
  - Source maps are uploaded during EAS Build
  - Release health dashboard shows crash-free rate, session count, and ANR rate
  - Sensitive user data is scrubbed from crash reports (PII filtering)
- **Dependencies:** None (standalone observability)
- **Notes:** Sentry and PostHog serve complementary purposes: Sentry for errors/crashes/performance, PostHog for user behavior/analytics. Both are needed.

---

## feat-037 -- Postmark Transactional Email

- **ID:** `feat-037`
- **Status:** `planned`
- **User type:** `all`
- **Phase:** `v1`
- **Owner agent:** backend-engineer
- **Source:** Initial product scoping, May 2026
- **One-line description:** Transactional emails (workout reminders, trainer invites, account notifications) are sent via Postmark, chosen for its 98.7% inbox placement rate.
- **Rationale:** Transactional email is essential for trainer invites (feat-020), workout reminders, and account management (password reset, deletion confirmation). Postmark was chosen over SendGrid for its superior inbox placement rate (98.7% vs 95.3%), which directly impacts trainer invite acceptance rates.
- **Acceptance criteria:**
  - Postmark is configured for sending transactional emails
  - Email templates exist for: trainer invite, workout reminder, account deletion confirmation, data export ready
  - Emails are sent from a verified domain with DKIM/SPF/DMARC
  - Postmark API key is server-side only (Supabase Edge Function or worker)
  - Email sending does not block any user-facing flow (async via worker or Edge Function)
  - Bounce and complaint handling is configured
  - Unsubscribe links are included in reminder-type emails
- **Dependencies:** `feat-033` (Clerk auth for user email address), `feat-020` (trainer invites as a primary use case)
- **Notes:** Postmark is for transactional email only, not marketing/bulk email. Marketing email provider is TBD if needed in the future.

---

## feat-038 -- Apple Watch Native SwiftUI App

- **ID:** `feat-038`
- **Status:** `planned`
- **User type:** `lifter`
- **Phase:** `v2`
- **Owner agent:** mobile-architect
- **Source:** Initial product scoping, May 2026
- **One-line description:** A native SwiftUI Apple Watch companion app for quick set logging and rest timer management, bridged to the React Native app via `react-native-watch-connectivity`.
- **Rationale:** Apple Watch is the most natural input device for gym use -- it is always on the wrist, requires no pocket fumbling, and can display the rest timer at a glance. The watch app must be native SwiftUI because React Native does not run on watchOS. The bridge enables bidirectional data flow with the phone app.
- **Acceptance criteria:**
  - Apple Watch app is built in native SwiftUI (NOT React Native)
  - Watch app can display the current workout state (exercise, set count, rest timer)
  - Watch app can log a set (confirm reps/weight with pre-filled values from the phone)
  - Rest timer is displayed as a complication and in the watch app
  - Data syncs bidirectionally between watch and phone via `react-native-watch-connectivity`
  - Watch app works independently when phone is not nearby (needs decision on standalone capability)
  - Watch app respects the same unit system settings as the phone app (feat-015)
- **Dependencies:** `feat-001` (workout data), `feat-008` (screen-state preservation for sync), `feat-011` (rest timer), `feat-015` (unit system)
- **Notes:** Phase 2/3 feature. Requires a dedicated SwiftUI developer or significant Swift knowledge. The watch app communicates with the phone app, NOT directly with Supabase. (Needs decision) -- whether the watch app should work fully standalone (with its own SQLite and sync) or only as a phone companion.

---

<!-- END OF FEATURE LEDGER -->
<!-- Next available ID: feat-039 -->
