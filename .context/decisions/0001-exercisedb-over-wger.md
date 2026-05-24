# ADR 0001 — Use ExerciseDB over Wger for Catalog Data

**Date:** 2026-05-07
**Status:** Accepted
**Decider:** project owner

## Context

The app needs a pre-loaded catalog of ~5000 exercises and ~50 equipment types. Two options were evaluated: ExerciseDB (paid, via RapidAPI) and Wger (open source, free).

## Decision

ExerciseDB.

## Rationale

Data quality, video consistency, and equipment tagging are dramatically better in ExerciseDB. Every exercise has a high-resolution GIF filmed in a consistent visual style. Equipment is precisely categorized (`leverage_machine` vs `selectorized_machine` vs `cable`). Muscle group tagging distinguishes primary from secondary.

Wger is community-contributed; data quality is uneven. Some exercises have no video, others have community videos of varying quality. Equipment tagging is broader. Cleaning Wger to ExerciseDB quality is hundreds of hours.

The dev tier of ExerciseDB (~690 requests/month, free) is sufficient for the initial seed and quarterly refreshes. Production tier ($20–50/month) is acceptable on launch.

## Consequences

- Recurring cost for catalog data.
- Catalog bundled at build time; runtime API calls go through an Edge Function.
- ExerciseDB IDs stored as `external_id` for refresh and dedupe.

## Revisit When

- ExerciseDB significantly raises pricing.
- A higher-quality alternative emerges.
- We need exercises ExerciseDB doesn't cover (rare).
