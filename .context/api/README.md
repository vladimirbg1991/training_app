# External API Reference Documentation

This folder is for offline copies of external API documentation that the agents reference.

**Files to add when the relevant integration is being built:**

- `exercisedb-reference.md` — request/response shapes for ExerciseDB, used by `packages/data-sources/exercisedb` and the catalog-refresh worker.
- `mux-reference.md` — Mux upload, asset, and playback ID lifecycle, used by the video upload worker and the mobile player.
- `clerk-reference.md` — Clerk JWT claim structure, Organizations API, and the Supabase third-party-auth integration contract.
- `powersync-reference.md` — Sync Streams syntax, JWT verification config, conflict resolution semantics.
- `revenuecat-reference.md` — webhook event shapes, REST API endpoints used by the daily reconciliation job.

These exist so an agent can cite a specific field shape without re-fetching the live docs every session. Add them as you actually integrate each service.
