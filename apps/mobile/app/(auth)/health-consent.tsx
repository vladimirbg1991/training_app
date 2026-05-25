/**
 * Health Data Consent Screen
 *
 * Shown during onboarding, AFTER user-type selection but BEFORE entering the main app.
 * Required by MHMDA (My Health My Data Act) — health data consent must be
 * captured separately from the general Terms of Service.
 *
 * This screen captures explicit opt-in for:
 * - Body weight and composition tracking
 * - Workout and exercise logging (considered "health data" under MHMDA)
 * - Future: HealthKit/Health Connect sync
 *
 * The consent is stored in Clerk unsafeMetadata.healthDataConsent = true
 * and persisted to the user's preferences.
 */

import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconShieldCheck, IconInfoCircle } from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';

const CONSENT_POINTS = [
  {
    title: 'Workout & exercise data',
    description: 'We store your sets, reps, weights, and workout history on your device and sync it securely to our servers.',
  },
  {
    title: 'Body measurements',
    description: 'If you choose to log body weight, body fat, or circumference measurements, this data is stored privately.',
  },
  {
    title: 'Your data stays yours',
    description: 'You can export or delete all your health data at any time from Settings → Data & Privacy.',
  },
] as const;

export default function HealthConsentScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const handleAccept = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          healthDataConsent: true,
          healthDataConsentAt: new Date().toISOString(),
        },
      });
      // Navigate to the main app — AuthGate will pick up the user type
      router.replace('/(lifter)/(home)');
    } catch {
      // Silently retry on next app launch
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  const handleDecline = useCallback(() => {
    // User can still use the app but body-comp features will be gated
    router.replace('/(lifter)/(home)');
  }, [router]);

  const handlePrivacyPolicy = useCallback(() => {
    Linking.openURL('https://pulse.fitness/privacy'); // placeholder URL
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-2xl bg-hero items-center justify-center mb-4">
            <IconShieldCheck size={32} color={Colors.primary} />
          </View>
          <Text className="text-primary text-title text-center" accessibilityRole="header">
            Your health data, your control
          </Text>
          <Text className="text-ambient text-body-sm text-center mt-2 px-4">
            Pulse collects fitness data to help you track progress. We need your consent to store this data securely.
          </Text>
        </View>

        {/* Consent points */}
        {CONSENT_POINTS.map((point, i) => (
          <View
            key={point.title}
            className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle"
          >
            <Text className="text-primary text-subtitle font-medium mb-1">{point.title}</Text>
            <Text className="text-ambient text-body-sm">{point.description}</Text>
          </View>
        ))}

        {/* Disclaimer */}
        <View className="flex-row items-start bg-card rounded-card p-3 mt-4 mb-6 border-[0.5px] border-border-subtle">
          <IconInfoCircle size={14} color={Colors.label} style={{ marginTop: 2 }} />
          <Text className="text-label text-[10px] ml-2 flex-1 leading-4">
            For personal fitness tracking only. Not a medical assessment. Consult a healthcare professional for medical guidance. You can withdraw consent at any time in Settings.
          </Text>
        </View>

        {/* Actions */}
        <Pressable
          onPress={handleAccept}
          disabled={loading}
          className="bg-accent rounded-btn min-h-btn items-center justify-center mb-3"
          accessibilityRole="button"
          accessibilityLabel="Accept health data consent"
        >
          {loading ? (
            <ActivityIndicator color={Colors.accentText} />
          ) : (
            <Text className="text-accent-text text-[14px] font-medium">I agree — let's train</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleDecline}
          className="rounded-btn min-h-btn-sm items-center justify-center mb-4"
          accessibilityRole="button"
          accessibilityLabel="Decline and continue without body tracking"
        >
          <Text className="text-label text-body-sm">Skip for now</Text>
        </Pressable>

        <Pressable
          onPress={handlePrivacyPolicy}
          className="items-center mb-8"
          accessibilityRole="link"
          accessibilityLabel="Read privacy policy"
        >
          <Text className="text-label text-body-sm underline">Read our Privacy Policy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
