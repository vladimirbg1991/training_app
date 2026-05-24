# ADR 0004 — Second-opinion review of the agent scaffold

**Date:** 2026-05-07
**Status:** Accepted
**Decider:** project owner

## Context

A second AI model reviewed the agent scaffold and tech stack. The review validated the core architecture and proposed additions/clarifications.

## Decision

Updates accepted, applied as patches to existing agent files. Question deferred pending product-scope clarification (public sharing model) was answered "private-by-default for v1" and applied as patch 6.

**Accepted as patches:**

1. Pre-cache routine for offline (`mobile-architect.md`) — explicit user-triggered download flow, not just passive caching.
2. Stepped haptic numeric input (`ux-flow-architect.md`) — replaces keyboard as default for the set-logging path.
3. Optimistic prefill on QR landing (`qr-and-deeplink-specialist.md`) — explicit local-query behavior on deep-link mount.
4. Sync-rules test scenarios (`data-sync-engineer.md`) — 10 mandatory test cases for any sync-rules change.
5. App Store and regulatory positioning (`fitness-domain-expert.md`) — explicit "Health & Fitness, not Medical" stance, MHMDA/GDPR/CCPA compliance flow, App Review submission language.
6. Private-by-default with sharing-shaped seams — three-column schema pattern (visibility enum, is_shareable boolean, origin_id UUID) on every shareable entity.
7. Two-speed data architecture rule — explicit naming for "PowerSync for personal data, server-paginated queries for aggregate data."

**Already covered in the existing scaffold (no change needed):**

- Apple Watch must be native — already in CLAUDE.md and the deep-research artifact.
- Trainer-client RBAC via Clerk Organizations — already specified.
- PowerSync complexity warning — sync-rules test scenarios make it explicit.

## Rationale

The second-opinion review was high quality. Of the suggestions, two filled real gaps (pre-cache, regulatory positioning), three sharpened existing rules (numeric input, QR prefill, two-speed naming), one made implicit testing explicit (sync-rules scenarios), and one captured product scope (private-by-default with seams). The exercise validated that the core architecture is sound.

## Consequences

The patches add ~250 lines across five agent files. No breaking changes to the agent contracts. Future second-opinion reviews should be invited at each phase boundary.

## Revisit When

- Phase boundaries (v0 → v1, v1 → v2).
- Whenever a third party reviews the architecture.
- Whenever an App Review issue reveals that the regulatory positioning needs sharpening.
