# ADR 0003 — Use Drizzle ORM over Prisma

**Date:** 2026-05-07
**Status:** Accepted
**Decider:** project owner

## Context

The platform uses Postgres on the server and SQLite on the device. Both need a TypeScript ORM or query builder.

## Decision

Drizzle.

## Rationale

Drizzle runs in edge runtimes (Supabase Edge Functions, Cloudflare Workers) without a separate engine binary. Prisma's runtime requires a Node.js engine that doesn't fit cleanly in many edge environments without workarounds.

Drizzle's query builder is closer to SQL, which matters when writing custom sync logic (where understanding exactly what SQL is generated is critical) and when working with PowerSync's expectations.

Drizzle's schema definition uses TypeScript files that compose into both Postgres and SQLite schemas with minimal divergence — useful when the same schema must run on both sides of the sync.

Drizzle has an experimental client-side adapter for PowerSync's local SQLite, so the same query layer works end-to-end.

PlanetScale acquired the Drizzle team in Q1 2026, providing a real corporate backer.

Prisma 7 (Nov 2025) killed its Rust query engine and shrunk to 1.6MB gzipped — improvements, but Drizzle is still ~130× smaller and edge-native.

## Consequences

- Migrations are managed via drizzle-kit (less polished than Prisma Migrate but sufficient).
- The Drizzle schema is the source of truth, used in mobile (SQLite), workers (Postgres), and Edge Functions.
- Some Drizzle ergonomic gaps require manual SQL or `with` clauses.

## Revisit When

- Drizzle development stalls.
- Prisma adds full edge-runtime support without workarounds.
