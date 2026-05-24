# Idea Log

Deferred ideas, "think about this later" items, and parked features.
Sorted by date descending. Status legend: open / accepted / rejected / merged.

## 2026-05-07 — Social and sharing features (deferred)

- **Source:** Initial product scoping conversation, May 2026
- **Status:** open
- **Triggering context:** Project owner asked whether v1 should support public sharing of workouts and videos. Decision was "not in v1, possibly later."
- **The idea:** A future phase introduces some combination of: public profile pages, follower/following relationships, a workout feed, public routine library with cloning, comments and likes, leaderboards, "challenges" with friends.
- **Considerations:** 
  - Each sub-feature has its own scope and can be shipped independently. Public routine library is the lightest lift and probably the highest-value first step.
  - Privacy policy expands significantly when public surfaces ship — additional consent flow, additional MHMDA/GDPR considerations.
  - Moderation tooling becomes mandatory once user-generated content is publicly visible.
  - The schema is already prepared for this via the `visibility` enum, `is_shareable` boolean, and `origin_id` columns (see data-sync-engineer agent file).
  - Vendor choice for Speed 2 is deferred. When a feed feature is greenlit, evaluate Supabase queries + TanStack Query (simplest), GetStream (specialized feeds), or Knock (notifications-aware feeds).
- **Next step:** Park until one of the trigger conditions in the decisions-log entry fires. Do not pre-build.
