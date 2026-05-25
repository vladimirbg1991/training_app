/**
 * PowerSync React context provider.
 *
 * Wraps the app in PowerSyncContext so all descendants can use:
 *   - useQuery() for live SQLite reads
 *   - usePowerSync() for direct database access
 *
 * Lifecycle:
 *   1. On mount, creates the PowerSyncDatabase and runs init() + PRAGMAs
 *   2. When Clerk auth is available AND db is ready, connects
 *   3. On unmount (or sign-out), disconnects cleanly
 *   4. Children are not rendered until db.init() completes (prevents empty queries)
 *
 * Must be placed INSIDE ClerkProvider (needs useAuth) and OUTSIDE any
 * components that use PowerSync hooks.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { PowerSyncContext, PowerSyncDatabase } from '@powersync/react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Colors } from '@/constants/colors';
import { powersyncSchema } from './schema';
import { SupabasePowerSyncConnector } from './connector';

const DB_FILENAME = 'pulse.sqlite';

/**
 * Singleton database instance.
 * Created once outside the component to survive re-renders.
 * PowerSync recommends a single database instance per app lifecycle.
 */
let powersyncDb: PowerSyncDatabase | null = null;

function getDatabase(): PowerSyncDatabase {
  if (!powersyncDb) {
    powersyncDb = new PowerSyncDatabase({
      schema: powersyncSchema,
      database: { dbFilename: DB_FILENAME },
    });
  }
  return powersyncDb;
}

interface PowerSyncProviderProps {
  children: React.ReactNode;
}

export function PowerSyncProvider({ children }: PowerSyncProviderProps): React.JSX.Element {
  const { getToken, isSignedIn } = useAuth();
  const [db] = useState(() => getDatabase());
  const [isDbReady, setIsDbReady] = useState(false);
  const connectedRef = useRef(false);

  /**
   * Wrap getToken for the connector.
   * The template matches the Supabase integration token template in Clerk,
   * which embeds the Clerk user ID as the JWT 'sub' claim.
   */
  const fetchToken = useCallback(async (): Promise<string | null> => {
    return getToken({ template: 'supabase' });
  }, [getToken]);

  // Step 1: Initialize database — must complete before connect or any queries
  useEffect(() => {
    let cancelled = false;

    const initDb = async (): Promise<void> => {
      try {
        await db.init();

        // Set SQLite PRAGMAs for the "never lose a set" guarantee:
        // - busy_timeout: wait up to 2s instead of failing on locked DB
        // - synchronous=NORMAL: ~2x write speed, safe with WAL
        // - journal_mode=WAL: concurrent reads during writes
        await db.execute('PRAGMA busy_timeout = 2000');
        await db.execute('PRAGMA synchronous = NORMAL');
        await db.execute('PRAGMA journal_mode = WAL');

        if (!cancelled) {
          setIsDbReady(true);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('PowerSync database init failed:', error);
        }
      }
    };

    initDb();

    return () => {
      cancelled = true;
    };
  }, [db]);

  // Step 2: Connect to sync service — only after DB is ready AND user is signed in
  useEffect(() => {
    if (!isDbReady || !isSignedIn) {
      if (connectedRef.current) {
        db.disconnect();
        connectedRef.current = false;
      }
      return;
    }

    const connector = new SupabasePowerSyncConnector(fetchToken);

    const connect = async (): Promise<void> => {
      try {
        await db.connect(connector);
        connectedRef.current = true;
      } catch (error) {
        if (__DEV__) {
          console.error('PowerSync connect failed:', error);
        }
      }
    };

    connect();

    return () => {
      if (connectedRef.current) {
        db.disconnect();
        connectedRef.current = false;
      }
    };
  }, [db, isDbReady, isSignedIn, fetchToken]);

  // Gate children until DB is initialized — prevents empty useQuery results
  if (!isDbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.page, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="small" />
      </View>
    );
  }

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
