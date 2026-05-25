import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { tokenCache } from '@/lib/auth/token-cache';
import { useUserType } from '@/lib/auth/use-user-type';
import { useWorkoutStore } from '@/stores/workout-store';
import { loadSnapshot } from '@/stores/mmkv';
import { PowerSyncProvider } from '@/lib/powersync';
import { AnalyticsProvider } from '@/lib/analytics';
import { PurchasesProvider } from '@/lib/purchases';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Keep splash screen visible while Clerk loads
SplashScreen.preventAutoHideAsync();

// Initialize Sentry — lower sample rates for production to control cost
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  profilesSampleRate: __DEV__ ? 1.0 : 0.1,
  sendDefaultPii: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error(
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing. Add it to .env.local.',
  );
}

/**
 * Auth-conditional routing with onboarding awareness.
 *
 * Three states:
 * 1. Not signed in → show (auth) screens
 * 2. Signed in, no userType → keep in (auth) for onboarding (user-type screen)
 * 3. Signed in with userType → route to the correct tab group
 */
function AuthGate(): React.JSX.Element {
  const { isSignedIn, isLoaded } = useAuth();
  const userType = useUserType();
  const segments = useSegments();
  const router = useRouter();
  const restoreFromSnapshot = useWorkoutStore((s) => s.restoreFromSnapshot);
  const workoutStatus = useWorkoutStore((s) => s.status);

  // Stabilize the dependency — only re-run when the first segment changes
  const firstSegment = segments[0];

  // Restore in-progress workout from MMKV on cold launch.
  // The useUser() hook provides the Clerk userId needed for SQLite reconciliation.
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    if (workoutStatus !== 'idle') return;
    const snapshot = loadSnapshot();
    if (!snapshot) return;
    restoreFromSnapshot(user.id)
      .then(() => {
        router.replace('/(lifter)/(workout)/active');
      })
      .catch(() => {
        // Restore failed — snapshot was stale or corrupted. Stay idle.
      });
  }, [isLoaded, isSignedIn, user?.id, workoutStatus, restoreFromSnapshot, router]);

  useEffect(() => {
    if (!isLoaded) return;

    // Hide splash screen once auth state is known
    SplashScreen.hideAsync();

    const inAuthGroup = firstSegment === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      // Not signed in → redirect to welcome
      router.replace('/(auth)/welcome');
    } else if (isSignedIn && !userType && !inAuthGroup) {
      // Signed in but hasn't completed onboarding → send to user-type
      router.replace('/(auth)/user-type');
    } else if (isSignedIn && userType && inAuthGroup) {
      // Signed in with userType but still in auth flow → route to main app
      switch (userType) {
        case 'trainer':
          router.replace('/(trainer)/(home)');
          break;
        case 'gym':
          router.replace('/(gym)/(dashboard)');
          break;
        case 'lifter':
        default:
          router.replace('/(lifter)/(home)');
      }
    }
    // If signed in without userType AND in auth group → stay (let them complete onboarding)
  }, [isSignedIn, isLoaded, firstSegment, userType]);

  return <Slot />;
}

function RootLayout(): React.JSX.Element {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <AnalyticsProvider>
        <PurchasesProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ErrorBoundary>
                <SafeAreaProvider>
                  <PowerSyncProvider>
                    <StatusBar style="light" />
                    <AuthGate />
                  </PowerSyncProvider>
                </SafeAreaProvider>
              </ErrorBoundary>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </PurchasesProvider>
      </AnalyticsProvider>
    </ClerkProvider>
  );
}

export default Sentry.wrap(RootLayout);
