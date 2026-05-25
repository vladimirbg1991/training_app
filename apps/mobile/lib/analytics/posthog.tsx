import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  PostHogProvider as PHProvider,
  usePostHog,
} from 'posthog-react-native';
import { useAuth } from '@clerk/clerk-expo';

// ---------------------------------------------------------------------------
// Analytics event catalogue
// ---------------------------------------------------------------------------

/**
 * Exhaustive list of tracked analytics events.
 * Add new events here — the `track()` helper enforces this union at the call site.
 */
export type AnalyticsEvent =
  | 'workout_started'
  | 'set_logged'
  | 'workout_completed'
  | 'exercise_searched'
  | 'routine_created'
  | 'routine_started'
  | 'screen_viewed'
  | 'paywall_shown'
  | 'purchase_started'
  | 'purchase_completed';

// ---------------------------------------------------------------------------
// Configuration (build-time constants)
// ---------------------------------------------------------------------------

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST;

/** True when both the project key and host are present. */
const isConfigured = Boolean(POSTHOG_KEY && POSTHOG_HOST);

// ---------------------------------------------------------------------------
// Analytics helper
// ---------------------------------------------------------------------------

interface AnalyticsHelpers {
  track: (event: AnalyticsEvent, properties?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsHelpers>({
  track: () => {
    // No-op default — safe when PostHog is not configured.
  },
});

/**
 * Hook that returns typed analytics methods.
 *
 * ```ts
 * const { track } = useAnalytics();
 * track('workout_started', { routineId });
 * ```
 */
export function useAnalytics(): AnalyticsHelpers {
  return useContext(AnalyticsContext);
}

// ---------------------------------------------------------------------------
// Standalone analytics object (for use outside React)
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget analytics tracker that can be imported anywhere.
 *
 * Uses `posthog-react-native`'s internal client singleton once the provider
 * has initialised. Before that, calls are silently dropped.
 *
 * Prefer `useAnalytics()` inside components — this is for stores, utils, etc.
 */
export const analytics = {
  /**
   * Capture an analytics event with optional properties.
   * No-op when PostHog is not configured or the provider has not mounted yet.
   */
  track: (
    _event: AnalyticsEvent,
    _properties?: Record<string, unknown>,
  ): void => {
    // Replaced at runtime by AnalyticsProvider once PostHog is available.
  },
};

// ---------------------------------------------------------------------------
// User identification bridge (Clerk -> PostHog)
// ---------------------------------------------------------------------------

function PostHogIdentifier(): null {
  const posthog = usePostHog();
  const { userId, isSignedIn } = useAuth();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog) return;

    if (isSignedIn && userId && previousUserIdRef.current !== userId) {
      posthog.identify(userId);
      previousUserIdRef.current = userId;
    }

    if (!isSignedIn && previousUserIdRef.current !== null) {
      posthog.reset();
      previousUserIdRef.current = null;
    }
  }, [posthog, isSignedIn, userId]);

  return null;
}

// ---------------------------------------------------------------------------
// Inner provider (requires PostHog context)
// ---------------------------------------------------------------------------

function AnalyticsInner({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const posthog = usePostHog();

  const track = useCallback(
    (event: AnalyticsEvent, properties?: Record<string, unknown>) => {
      posthog?.capture(event, properties);
    },
    [posthog],
  );

  // Patch the standalone analytics object so non-React callers work too.
  useEffect(() => {
    analytics.track = track;
    return () => {
      analytics.track = () => {};
    };
  }, [track]);

  const value = useMemo<AnalyticsHelpers>(() => ({ track }), [track]);

  return (
    <AnalyticsContext.Provider value={value}>
      <PostHogIdentifier />
      {children}
    </AnalyticsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Public provider
// ---------------------------------------------------------------------------

/**
 * Wraps `PostHogProvider` from `posthog-react-native` and wires up Clerk
 * user identification automatically.
 *
 * Place inside `ClerkProvider` (needs auth state) and before any screen that
 * calls `useAnalytics()`.
 *
 * When `EXPO_PUBLIC_POSTHOG_KEY` or `EXPO_PUBLIC_POSTHOG_HOST` are missing
 * the provider renders children directly — no crash, no network calls.
 */
export function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  if (!isConfigured) {
    return <>{children}</>;
  }

  return (
    <PHProvider
      apiKey={POSTHOG_KEY!}
      options={{
        host: POSTHOG_HOST,
        // Disable automatic screen tracking — we fire `screen_viewed` manually
        // to keep event names in the AnalyticsEvent union.
        captureNativeAppLifecycleEvents: false,
      }}
      autocapture={false}
    >
      <AnalyticsInner>{children}</AnalyticsInner>
    </PHProvider>
  );
}
