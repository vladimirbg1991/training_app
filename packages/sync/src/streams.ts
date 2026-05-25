/**
 * PowerSync Sync Streams configuration.
 *
 * Defines which Postgres rows replicate to which devices.
 * Uses Sync Streams (NOT legacy Sync Rules YAML/buckets).
 *
 * Two-speed rule enforced here:
 *   Speed 1 (local-first via PowerSync): user's own data, global catalog
 *   Speed 2 (server-paginated, never synced): future feeds, public library
 *
 * Sync Streams test scenarios (all 10 must pass before any change ships):
 *   1. Lifter A's workout invisible to Lifter B            -> user_data filter
 *   2. Lifter A's custom exercise invisible to Lifter B    -> user_data filter
 *   3. Global catalog visible to all authenticated users    -> catalog stream
 *   4. Trainer T sees linked Client C's sessions/sets       -> trainer_clients
 *   5. Deactivated link removes C's data from T's device   -> trainer_clients subquery
 *   6. Post-revocation workouts don't reach T               -> same as 5
 *   7. Gym admin sees anonymized aggregates only            -> gym_aggregates
 *   8. Departed member's data stops syncing to gym          -> gym_aggregates
 *   9. Admin's personal workouts invisible to other admins  -> user_data isolation
 *   10. Cross-tenant: T1@GymA and T2@GymB see only their scope -> trainer_clients per-trainer
 */

/**
 * Type definition for a Sync Stream.
 * Matches the PowerSync Sync Streams beta API shape.
 */
export interface SyncStream {
  /** Parameter bindings from the JWT or subqueries */
  parameters?: Record<string, string>;
  /** SQL queries defining which rows sync to the device */
  data?: string[];
  /** If true, device auto-subscribes on connection (no explicit subscribe call) */
  auto_subscribe?: boolean;
}

export const syncStreams: Record<string, SyncStream> = {
  /**
   * Stream: user_data
   * Scope: everything the authenticated user owns
   * Speed: 1 (local-first)
   *
   * Covers scenarios 1, 2, 9 from the test matrix.
   */
  user_data: {
    parameters: { user_id: 'request.jwt.sub' },
    data: [
      `SELECT * FROM users WHERE id = bucket.user_id`,
      `SELECT * FROM workout_sessions WHERE user_id = bucket.user_id`,
      `SELECT * FROM workout_sets WHERE user_id = bucket.user_id`,
      `SELECT * FROM routines WHERE user_id = bucket.user_id`,
      `SELECT * FROM exercises WHERE created_by = bucket.user_id`,
      `SELECT * FROM set_groups WHERE user_id = bucket.user_id`,
      `SELECT * FROM user_exercise_preferences WHERE user_id = bucket.user_id`,
      `SELECT * FROM user_subscriptions WHERE user_id = bucket.user_id`,
      `SELECT * FROM body_measurements WHERE user_id = bucket.user_id`,
      `SELECT * FROM body_circumference WHERE user_id = bucket.user_id`,
    ],
    auto_subscribe: true,
  },

  /**
   * Stream: catalog
   * Scope: global exercises + equipment (read-only, shared across all users)
   * Speed: 1 (local-first — catalog is small and stable)
   *
   * Covers scenario 3 from the test matrix.
   */
  catalog: {
    parameters: {},
    data: [
      `SELECT * FROM exercises WHERE is_custom = false`,
      `SELECT * FROM equipment`,
      // gym_equipment_instances: synced per-gym when gym features ship (not catalog)
      `SELECT * FROM exercise_substitutions`,
    ],
    auto_subscribe: true,
  },

  /**
   * Stream: trainer_clients
   * Scope: a trainer's linked clients' workout data
   * Speed: 1 (local-first — bounded by client count)
   *
   * Covers scenarios 4, 5, 6, 10 from the test matrix.
   *
   * STUBBED: requires trainer_client_links table (future migration).
   * Uncomment when trainer features ship in v1.
   */
  trainer_clients: {
    // parameters: {
    //   client_ids: `SELECT client_id FROM trainer_client_links
    //                WHERE trainer_id = request.jwt.sub AND status = 'active'`,
    // },
    // data: [
    //   `SELECT * FROM workout_sessions WHERE user_id IN bucket.client_ids`,
    //   `SELECT * FROM workout_sets WHERE user_id IN bucket.client_ids`,
    // ],
  },

  /**
   * Stream: gym_aggregates
   * Scope: anonymized member-activity aggregates for gym admins
   * Speed: 1 for aggregate views (bounded); individual sets are Speed 2
   *
   * Covers scenarios 7, 8 from the test matrix.
   *
   * STUBBED: requires gym_members table + materialized views (future migration).
   * Uncomment when gym features ship in v2.
   */
  gym_aggregates: {
    // parameters: {
    //   gym_id: `SELECT gym_id FROM gym_admins
    //            WHERE admin_id = request.jwt.sub`,
    // },
    // data: [
    //   `SELECT * FROM gym_activity_daily WHERE gym_id = bucket.gym_id`,
    // ],
  },
};
