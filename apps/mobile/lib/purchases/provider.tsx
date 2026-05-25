import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useAuth } from '@clerk/clerk-expo';

// ---------------------------------------------------------------------------
// Configuration (build-time constants, public SDK keys)
// ---------------------------------------------------------------------------

const REVENUECAT_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
const REVENUECAT_GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

function getPlatformKey(): string | undefined {
  return Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
}

const isConfigured = Boolean(getPlatformKey());

// ---------------------------------------------------------------------------
// Premium state
// ---------------------------------------------------------------------------

export interface PremiumState {
  /** User has an active premium entitlement (paid or trialing). */
  isPremium: boolean;
  /** User is in a free-trial period. */
  isTrialing: boolean;
  /** Collapsed tier for quick checks. */
  tier: 'free' | 'trial' | 'premium';
  /** When the current entitlement expires, or null for free users. */
  expiresAt: Date | null;
}

const DEFAULT_PREMIUM: PremiumState = {
  isPremium: false,
  isTrialing: false,
  tier: 'free',
  expiresAt: null,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PurchasesContext = createContext<PremiumState>(DEFAULT_PREMIUM);

/**
 * Returns the user's current subscription state.
 *
 * ```ts
 * const { isPremium, tier } = usePremium();
 * ```
 */
export function usePremium(): PremiumState {
  return useContext(PurchasesContext);
}

// ---------------------------------------------------------------------------
// Purchase helper (for paywall screens)
// ---------------------------------------------------------------------------

/**
 * Purchase a specific RevenueCat package and return the resulting customer info.
 *
 * Call this from your paywall screen:
 * ```ts
 * const info = await purchasePackage(selectedPackage);
 * ```
 *
 * Throws if the purchase fails (user cancellation, billing error, etc.).
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PREMIUM_ENTITLEMENT_ID = 'premium';

function derivePremiumState(info: CustomerInfo): PremiumState {
  const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT_ID];

  if (!entitlement) {
    return DEFAULT_PREMIUM;
  }

  const isTrialing = entitlement.periodType === 'TRIAL';
  const expiresAt = entitlement.expirationDate
    ? new Date(entitlement.expirationDate)
    : null;

  return {
    isPremium: true,
    isTrialing,
    tier: isTrialing ? 'trial' : 'premium',
    expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Initialisation bridge (Clerk -> RevenueCat)
// ---------------------------------------------------------------------------

function RevenueCatIdentifier(): null {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isConfigured) return;

    if (isSignedIn && userId) {
      // logIn returns the new CustomerInfo but we don't need it here — the
      // listener picks up changes.
      Purchases.logIn(userId).catch(() => {
        // Silent — RevenueCat retries internally.
      });
    }

    if (!isSignedIn) {
      // When the user signs out we reset the RevenueCat anonymous user to
      // avoid leaking entitlement state to the next sign-in.
      Purchases.logOut().catch(() => {
        // Silent — a new anonymous user is created on next launch regardless.
      });
    }
  }, [isSignedIn, userId]);

  return null;
}

// ---------------------------------------------------------------------------
// Public provider
// ---------------------------------------------------------------------------

/**
 * Initialises RevenueCat and provides premium-state context to the tree.
 *
 * Place inside `ClerkProvider` (needs auth) and before any screen that calls
 * `usePremium()`.
 *
 * When the platform-specific API key is missing the provider renders children
 * directly — no crash, no store calls.
 */
export function PurchasesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [premium, setPremium] = useState<PremiumState>(DEFAULT_PREMIUM);

  // Initialise the SDK once on mount.
  useEffect(() => {
    const apiKey = getPlatformKey();
    if (!apiKey) return;

    Purchases.configure({
      apiKey,
    });

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Fetch initial customer info.
    Purchases.getCustomerInfo()
      .then((info) => setPremium(derivePremiumState(info)))
      .catch(() => {
        // Offline or first launch — stay on the default (free) state.
      });
  }, []);

  // Listen for real-time entitlement changes (renewals, cancellations, upgrades).
  useEffect(() => {
    if (!isConfigured) return;

    const listener = (info: CustomerInfo) => {
      setPremium(derivePremiumState(info));
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const value = useMemo(() => premium, [premium]);

  return (
    <PurchasesContext.Provider value={value}>
      <RevenueCatIdentifier />
      {children}
    </PurchasesContext.Provider>
  );
}
