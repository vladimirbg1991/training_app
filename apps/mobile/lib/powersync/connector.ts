/**
 * PowerSync backend connector.
 *
 * Implements PowerSyncBackendConnector to bridge PowerSync with:
 *   - Clerk (auth tokens)
 *   - Supabase REST API (data upload)
 *
 * This is the ONLY place in the mobile app that calls fetch() directly.
 * UI components never touch the network — they read from local SQLite.
 *
 * Upload flow:
 *   1. PowerSync accumulates local CRUD operations in its upload queue
 *   2. When connectivity is available, it calls uploadData()
 *   3. We iterate over each operation, map it to a Supabase REST call
 *   4. On success, mark the transaction complete
 *   5. On failure, throw — PowerSync retries with exponential backoff
 */

import {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';

type GetTokenFn = () => Promise<string | null>;

/** Tables the connector is allowed to write to via Supabase REST API. */
const ALLOWED_TABLES = new Set([
  'users',
  'exercises',
  'routines',
  'workout_sessions',
  'workout_sets',
  'set_groups',
  'user_exercise_preferences',
  'body_measurements',
  'body_circumference',
  // gym_equipment_instances and exercise_substitutions are catalog-only (no client writes)
]);

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  private getToken: GetTokenFn;

  /**
   * @param getToken — Async function that returns a fresh Clerk JWT.
   *   Typically bound to `getToken({ template: 'supabase' })` from useAuth().
   */
  constructor(getToken: GetTokenFn) {
    this.getToken = getToken;
  }

  /**
   * Called by PowerSync to get credentials for the sync connection.
   * Returns the PowerSync service URL and a fresh Clerk JWT.
   */
  async fetchCredentials(): Promise<{ endpoint: string; token: string }> {
    const token = await this.getToken();

    if (!token) {
      throw new Error(
        'PowerSync fetchCredentials: no auth token available. Is the user signed in?',
      );
    }

    const endpoint = process.env.EXPO_PUBLIC_POWERSYNC_URL;
    if (!endpoint) {
      throw new Error(
        'EXPO_PUBLIC_POWERSYNC_URL is missing. Add it to .env.local.',
      );
    }

    return { endpoint, token };
  }

  /**
   * Called by PowerSync when local writes need to be pushed to the server.
   *
   * Maps PowerSync CRUD operations to Supabase PostgREST calls:
   *   PUT   -> POST with Prefer: resolution=merge-duplicates (upsert)
   *   PATCH -> PATCH with id filter
   *   DELETE -> DELETE with id filter
   *
   * The entire transaction succeeds or fails atomically from PowerSync's
   * perspective. On failure, the transaction stays in the queue for retry.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.',
      );
    }

    try {
      let token = await this.getToken();

      for (let i = 0; i < transaction.crud.length; i++) {
        const op = transaction.crud[i]!;
        const { table, opData: data, id, op: opType } = op;

        // Defense-in-depth: only allow writes to known tables
        if (!ALLOWED_TABLES.has(table)) {
          if (__DEV__) {
            console.warn(`PowerSync upload: unexpected table "${table}", skipping`);
          }
          continue;
        }

        // Refresh token periodically for large transactions
        if (i > 0 && i % 10 === 0) {
          token = await this.getToken();
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${token}`,
          Prefer: 'return=minimal',
        };

        let url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`;
        let method: string;
        let body: string | undefined;

        switch (opType) {
          case UpdateType.PUT:
            method = 'POST';
            body = JSON.stringify({ ...data, id });
            headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
            break;

          case UpdateType.PATCH:
            method = 'PATCH';
            url += `?id=eq.${encodeURIComponent(id)}`;
            body = JSON.stringify(data);
            break;

          case UpdateType.DELETE:
            method = 'DELETE';
            url += `?id=eq.${encodeURIComponent(id)}`;
            break;

          default:
            if (__DEV__) {
              console.warn(`PowerSync upload: unknown op type ${String(opType)}, skipping`);
            }
            continue;
        }

        const response = await fetch(url, { method, headers, body });

        if (!response.ok) {
          if (__DEV__) {
            const responseText = await response.text();
            console.error(`Upload failed: ${method} ${table} (${id}): ${response.status} ${responseText}`);
          }
          throw new Error(
            `Sync upload failed (${response.status}). Retrying automatically.`,
          );
        }
      }

      await transaction.complete();
    } catch (error) {
      if (__DEV__) {
        console.error('PowerSync upload error:', error);
      }
      throw error;
    }
  }
}
