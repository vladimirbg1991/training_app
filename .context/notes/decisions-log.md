# Decisions Log

## 2026-05-07 — Sharing model: private-by-default with three sharing-shaped schema seams

- **Decided by:** project owner
- **Decision:** v1 ships with no public sharing, no social feed, no follower model. Schema includes three sharing-related columns on every shareable entity from day one: `visibility` (enum), `is_shareable` (boolean for per-item PR sharing), and `origin_id` (UUID for clone attribution). Trainer-client and gym-admin scopes are the only cross-user visibility paths in v1. The platform also formalizes a "two-speed data architecture" rule: personal data uses PowerSync local-first; future aggregate/feed data uses server-paginated queries.
- **Alternatives considered:** Strict private with no sharing columns (rejected — schema migration to add sharing later is painful). Single visibility enum without `is_shareable` (rejected — doesn't handle "share one PR without making my profile public"). Pre-storing social handles in Clerk metadata (rejected — adds maintenance for a feature we may never build). Pre-picking a feed vendor like GetStream (rejected — premature; the landscape will shift before we need it).
- **Rationale:** Two-axis schema covers the realistic future sharing patterns without committing to UI. Two-speed naming prevents the worst class of bug in social fitness apps. Both decisions cost nothing in v1 and save weeks later.
- **Revisit when:** the first sharing-shaped feature is greenlit. At that point, choose the Speed 2 vendor and write the policy migrations.

## 2026-05-07 — Tech stack lock-in for v0

- **Decided by:** project owner
- **Decision:** Expo SDK 54+ with Development Builds, PowerSync (Sync Streams) + SQLite + Supabase Postgres, Clerk-as-IdP fronting Supabase, Drizzle ORM, NativeWind, Zustand + TanStack Query persisted via MMKV, FlashList, Reanimated 4, Mux for video, RevenueCat for subscriptions, BullMQ on Redis Cloud or Upstash Fixed (NOT PAYG), Node 22 workers on Fly.io/Railway (NOT Supabase Edge Functions for long-running jobs), Sentry, PostHog, Postmark, Expo Notifications + expo-live-activity. Apple Watch is native SwiftUI in Phase 2/3, not React Native.
- **Alternatives considered:** Bare React Native (rejected). Native iOS first (rejected). Prisma (rejected — edge runtime). Wger catalog (rejected — see ADR 0001). Auth0 (rejected — pricing). Supabase Auth alone (rejected — no native passkeys, MAU pricing cliff). Upstash PAYG for BullMQ (rejected — billing surprise). Cert pinning / JS obfuscation / root detection (rejected — security theater).
- **Rationale:** Maximizes offline reliability, AI-agent productivity, platform parity, and pricing predictability at scale. Validated by 2026 industry research review.
- **Revisit when:** Any chosen tool changes its license, pricing, or runtime support in a way that breaks the contract.

## 2026-05-07 — Three user types in v0 schema

- **Decided by:** project owner
- **Decision:** Sign-up captures user type (lifter | trainer | gym) via Clerk Organizations. All three are first-class in the schema from migration 0001.
- **Alternatives considered:** Single user type with feature flags (rejected — schema migrations later are painful).
- **Rationale:** Trainer and gym features deferred to v1+ but the data model is correct from day one.
- **Revisit when:** Never — this is foundational.

## 2026-05-07 — Balanced strictness for agent enforcement

- **Decided by:** project owner
- **Decision:** Agents warn loudly on rule violations and provide the fix, but allow `override: [reason]` during prototyping. The note-keeper logs every override.
- **Alternatives considered:** Strict (block on violations), Lenient (informational only).
- **Rationale:** Solo developer in prototyping phase — strict mode would slow exploration; lenient mode would let real bugs ship.
- **Revisit when:** Approaching production launch. Strict mode should re-engage before App Store submission.
