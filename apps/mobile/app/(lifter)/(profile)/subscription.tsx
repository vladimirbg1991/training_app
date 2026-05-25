import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import {
  IconX,
  IconRotateClockwise,
  IconBolt,
  IconChartLine,
  IconCloudDownload,
  IconBuilding,
  IconUserPlus,
  IconCamera,
  IconTrophy,
  IconCheck,
} from '@tabler/icons-react-native';

import { usePremium, purchasePackage } from '@/lib/purchases';
import { useAnalytics } from '@/lib/analytics';
import { Colors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TierId = 'annual' | 'monthly' | 'lifetime';

interface TierConfig {
  id: TierId;
  title: string;
  description: string;
  priceLabel: string;
  recommended: boolean;
  badge: string | null;
  badgeIcon: React.ReactNode | null;
}

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

const TIERS: TierConfig[] = [
  {
    id: 'annual',
    title: 'Annual',
    description: '7-day free trial, then \u20AC59.99/year',
    priceLabel: '\u20AC4.99 per month',
    recommended: true,
    badge: 'SAVE 38%',
    badgeIcon: null,
  },
  {
    id: 'monthly',
    title: 'Monthly',
    description: '7-day free trial, then \u20AC7.99/mo',
    priceLabel: '',
    recommended: false,
    badge: null,
    badgeIcon: null,
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    description: 'Pay once, train forever',
    priceLabel: '\u20AC149 one-time',
    recommended: false,
    badge: null,
    badgeIcon: <IconTrophy size={14} color={Colors.amber} />,
  },
];

// ---------------------------------------------------------------------------
// Benefits
// ---------------------------------------------------------------------------

interface Benefit {
  icon: React.ReactNode;
  label: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: <IconChartLine size={18} color={Colors.accent} />,
    label: 'Advanced analytics & progress insights',
  },
  {
    icon: <IconCloudDownload size={18} color={Colors.accent} />,
    label: 'Offline video downloads',
  },
  {
    icon: <IconBuilding size={18} color={Colors.accent} />,
    label: 'Multiple gym profiles',
  },
  {
    icon: <IconUserPlus size={18} color={Colors.accent} />,
    label: 'Hire a personal trainer',
  },
  {
    icon: <IconCamera size={18} color={Colors.accent} />,
    label: 'Progress photos & comparisons',
  },
];

// ---------------------------------------------------------------------------
// RevenueCat configuration check
// ---------------------------------------------------------------------------

const REVENUECAT_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
const REVENUECAT_GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

function getPlatformKey(): string | undefined {
  return Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
}

const isRevenueCatConfigured = Boolean(getPlatformKey());

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SubscriptionScreen(): React.JSX.Element {
  const router = useRouter();
  const { track } = useAnalytics();
  const { isPremium } = usePremium();

  const [selectedTier, setSelectedTier] = useState<TierId>('annual');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Track paywall view on mount
  useEffect(() => {
    track('paywall_shown');
  }, [track]);

  // ---------------------------------------------------------------------------
  // Restore purchases
  // ---------------------------------------------------------------------------

  const handleRestore = useCallback(async () => {
    if (!isRevenueCatConfigured) {
      Alert.alert('Not available', 'Subscription services are not configured yet.');
      return;
    }

    try {
      const info = await Purchases.restorePurchases();
      const hasActive = Object.keys(info.entitlements.active).length > 0;
      Alert.alert(
        hasActive ? 'Restored' : 'No active subscriptions',
        hasActive
          ? 'Your premium access has been restored.'
          : 'We could not find any active subscriptions for this account.',
      );
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Purchase flow
  // ---------------------------------------------------------------------------

  const handlePurchase = useCallback(async () => {
    if (!isRevenueCatConfigured) {
      Alert.alert('Coming soon', 'Subscriptions will be available in a future update.');
      return;
    }

    track('purchase_started', { tier: selectedTier });
    setIsPurchasing(true);

    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;

      if (!current) {
        Alert.alert('Error', 'No offerings available. Please try again later.');
        setIsPurchasing(false);
        return;
      }

      // Map tier IDs to RevenueCat package identifiers
      let pkg: PurchasesPackage | undefined;
      if (selectedTier === 'annual') {
        pkg = current.annual ?? undefined;
      } else if (selectedTier === 'monthly') {
        pkg = current.monthly ?? undefined;
      } else if (selectedTier === 'lifetime') {
        pkg = current.lifetime ?? undefined;
      }

      if (!pkg) {
        Alert.alert('Error', 'Selected plan is not available. Please try a different option.');
        setIsPurchasing(false);
        return;
      }

      await purchasePackage(pkg);
      // Success: the PurchasesProvider listener will update isPremium.
      // Navigate back to profile.
      router.back();
    } catch (error: unknown) {
      const isCancelled =
        error instanceof Error &&
        (error.message.includes('cancelled') || error.message.includes('canceled'));

      if (!isCancelled) {
        Alert.alert('Purchase failed', 'Something went wrong. You have not been charged.');
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedTier, track, router]);

  // ---------------------------------------------------------------------------
  // CTA label
  // ---------------------------------------------------------------------------

  const ctaLabel = isPremium
    ? 'You are already subscribed'
    : !isRevenueCatConfigured
      ? 'Coming soon'
      : isPurchasing
        ? 'Processing...'
        : selectedTier === 'lifetime'
          ? 'Purchase lifetime access'
          : 'Start 7-day free trial';

  const ctaDisabled = isPremium || isPurchasing;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-2 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* Top bar: close + title + restore                                 */}
        {/* ================================================================= */}
        <View className="flex-row items-center justify-between mb-6">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="min-h-tap min-w-[44px] justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close paywall"
          >
            <IconX size={22} color={Colors.label} />
          </Pressable>

          <Text className="text-primary text-subtitle font-medium">
            Pulse Premium
          </Text>

          <Pressable
            onPress={handleRestore}
            hitSlop={8}
            className="min-h-tap min-w-[44px] items-end justify-center"
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <IconRotateClockwise size={20} color={Colors.label} />
          </Pressable>
        </View>

        {/* ================================================================= */}
        {/* Hero icon                                                         */}
        {/* ================================================================= */}
        <View className="items-center mb-5">
          <View className="w-16 h-16 rounded-card-hero bg-hero items-center justify-center">
            <IconBolt size={30} color={Colors.amber} />
          </View>
        </View>

        {/* ================================================================= */}
        {/* Headline + subtitle                                               */}
        {/* ================================================================= */}
        <Text
          className="text-primary text-center font-medium mb-2"
          style={{ fontSize: 26, lineHeight: 32 }}
          accessibilityRole="header"
        >
          Train without limits.
        </Text>
        <Text className="text-ambient text-body-sm text-center mb-6 px-4">
          Free covers the essentials. Premium unlocks everything else.
        </Text>

        {/* ================================================================= */}
        {/* Benefits list                                                     */}
        {/* ================================================================= */}
        <View className="bg-card rounded-card p-card-pad mb-5 border-[0.5px] border-border-subtle">
          {BENEFITS.map((benefit, index) => (
            <View
              key={benefit.label}
              className={`flex-row items-center ${index < BENEFITS.length - 1 ? 'mb-3' : ''}`}
            >
              <View className="w-8 h-8 rounded-btn-sm bg-stat-tile items-center justify-center mr-3">
                {benefit.icon}
              </View>
              <Text className="text-primary text-body-sm flex-1">
                {benefit.label}
              </Text>
              <IconCheck size={16} color={Colors.accent} />
            </View>
          ))}
        </View>

        {/* ================================================================= */}
        {/* Tier cards                                                        */}
        {/* ================================================================= */}
        {TIERS.map((tier) => {
          const isSelected = selectedTier === tier.id;
          const isRecommended = tier.recommended;

          return (
            <Pressable
              key={tier.id}
              onPress={() => setSelectedTier(tier.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${tier.title} plan${isRecommended ? ', recommended' : ''}`}
              className={`rounded-card p-card-pad mb-card-gap flex-row items-center ${
                isRecommended && isSelected
                  ? 'bg-hero'
                  : 'bg-card'
              }`}
              style={
                isSelected
                  ? { borderWidth: 1.5, borderColor: Colors.borderActive }
                  : { borderWidth: 0.5, borderColor: Colors.borderSubtle }
              }
            >
              {/* Radio indicator */}
              <View
                className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  isSelected ? 'border-accent bg-accent' : 'border-border-active'
                }`}
              >
                {isSelected && (
                  <View className="w-2 h-2 rounded-full bg-accent-text" />
                )}
              </View>

              {/* Text content */}
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-primary text-subtitle font-medium">
                    {tier.title}
                  </Text>
                  {tier.badgeIcon}
                  {tier.badge && (
                    <View className="bg-amber-bg rounded-pill px-2 py-0.5">
                      <Text className="text-amber text-[10px] font-medium">
                        {tier.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-ambient text-body-sm mt-0.5">
                  {tier.description}
                </Text>
                {tier.priceLabel !== '' && (
                  <Text className="text-label text-body-sm mt-0.5">
                    {tier.priceLabel}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* ================================================================= */}
        {/* Primary CTA                                                       */}
        {/* ================================================================= */}
        <Pressable
          onPress={handlePurchase}
          disabled={ctaDisabled}
          className={`rounded-btn min-h-btn items-center justify-center mt-2 mb-3 ${
            ctaDisabled ? 'bg-stat-tile' : 'bg-accent'
          }`}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text
            className={`text-[14px] font-medium ${
              ctaDisabled ? 'text-ambient' : 'text-accent-text'
            }`}
          >
            {ctaLabel}
          </Text>
        </Pressable>

        {/* ================================================================= */}
        {/* App Store fine print                                              */}
        {/* ================================================================= */}
        <Text className="text-label/60 text-[10px] text-center leading-[14px] px-6 mb-4">
          Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account
          at confirmation of purchase. Subscription automatically renews unless auto-renew is turned
          off at least 24 hours before the end of the current period. Your account will be charged
          for renewal within 24 hours prior to the end of the current period.
        </Text>

        {/* ================================================================= */}
        {/* Footer links                                                      */}
        {/* ================================================================= */}
        <View className="flex-row items-center justify-center gap-4 mb-4">
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text className="text-label text-body-sm">Privacy</Text>
          </Pressable>

          <Text className="text-border-subtle text-body-sm">{'\u00B7'}</Text>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
          >
            <Text className="text-label text-body-sm">Terms</Text>
          </Pressable>

          <Text className="text-border-subtle text-body-sm">{'\u00B7'}</Text>

          <Pressable
            onPress={handleRestore}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <Text className="text-label text-body-sm">Restore</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
