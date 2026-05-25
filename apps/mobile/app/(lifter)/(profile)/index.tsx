import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/expo';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { MMKV } from 'react-native-mmkv';
import Constants from 'expo-constants';
import {
  IconSettings,
  IconBuilding,
  IconCrown,
  IconShieldCheck,
  IconRuler,
  IconClock,
  IconVibrate,
  IconHeartRateMonitor,
  IconDownload,
  IconShieldLock,
  IconTrash,
  IconHelp,
  IconMessageCircle,
  IconChevronRight,
  IconFlame,
  IconTrophy,
  IconBarbell,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react-native';

import { usePremium } from '@/lib/purchases';
import { useUserProfile } from '@/lib/powersync';
import { useUserType } from '@/lib/auth/use-user-type';
import { workoutStore } from '@/stores/workout-store';
import { Colors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// MMKV for local-only settings (haptics)
// ---------------------------------------------------------------------------

const settingsStorage = new MMKV({ id: 'pulse-settings' });
const HAPTICS_KEY = 'haptics_enabled';

function getHapticsEnabled(): boolean {
  if (!settingsStorage.contains(HAPTICS_KEY)) return true; // default on
  return settingsStorage.getBoolean(HAPTICS_KEY) ?? true;
}

function setHapticsEnabled(enabled: boolean): void {
  settingsStorage.set(HAPTICS_KEY, enabled);
}

// ---------------------------------------------------------------------------
// SettingsRow component
// ---------------------------------------------------------------------------

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  trailing,
  destructive = false,
  disabled = false,
  isLast = false,
}: SettingsRowProps): React.JSX.Element {
  const content = (
    <View
      className={`flex-row items-center py-3 ${!isLast ? 'border-b-[0.5px] border-border-subtle' : ''}`}
    >
      <View className="w-8 h-8 rounded-btn-sm bg-stat-tile items-center justify-center mr-3">
        {icon}
      </View>
      <Text
        className={`flex-1 text-body-sm font-medium ${
          destructive ? 'text-coral' : disabled ? 'text-ambient/50' : 'text-primary'
        }`}
      >
        {label}
      </Text>
      {trailing ?? (
        <View className="flex-row items-center">
          {value != null && (
            <Text className="text-label text-body-sm mr-2">
              {value}
            </Text>
          )}
          <IconChevronRight size={16} color={disabled ? Colors.borderSubtle : Colors.label} />
        </View>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        className="active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={label}>
      {content}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader component
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: string }): React.JSX.Element {
  return (
    <Text className="text-label text-label-xs uppercase tracking-widest mb-1 mt-5">
      {children}
    </Text>
  );
}

// Streak uses the shared implementation from @gym-app/fitness-logic
// which allows rest days (maxGapDays=2 default) — matches calendar screen.
import { computeStreak as computeStreakFromLib } from '@gym-app/fitness-logic';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileSettingsScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const db = usePowerSync();
  const { isPremium, tier } = usePremium();
  const userType = useUserType();

  const userId = user?.id ?? '';
  const displayName = user?.fullName ?? user?.firstName ?? 'Lifter';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const initials = (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '');

  // ---------------------------------------------------------------------------
  // Data queries — local SQLite via PowerSync
  // ---------------------------------------------------------------------------

  const { data: profileRows } = useUserProfile(userId);
  const profile = profileRows?.[0] as
    | { default_unit: string; default_rest_seconds: number }
    | undefined;

  const currentUnit = (profile?.default_unit ?? 'kg') as 'kg' | 'lb';
  const currentRestSeconds = profile?.default_rest_seconds ?? 90;

  // Workout count
  const { data: workoutCountRows } = useQuery(
    `SELECT COUNT(*) AS count FROM workout_sessions WHERE user_id = ? AND status = 'completed'`,
    [userId],
  );
  const workoutCount = (workoutCountRows?.[0] as { count: number } | undefined)?.count ?? 0;

  // PR count
  const { data: prCountRows } = useQuery(
    `SELECT COUNT(*) AS count FROM workout_sets WHERE user_id = ? AND is_personal_record = 1`,
    [userId],
  );
  const prCount = (prCountRows?.[0] as { count: number } | undefined)?.count ?? 0;

  // Streak: get completed session dates
  const { data: sessionDateRows } = useQuery(
    `SELECT started_at FROM workout_sessions WHERE user_id = ? AND status = 'completed' ORDER BY started_at DESC`,
    [userId],
  );
  const streak = useMemo(() => {
    const dates = (sessionDateRows ?? []).map(
      (r: { started_at: string }) => r.started_at,
    );
    return computeStreakFromLib(dates).current;
  }, [sessionDateRows]);

  // ---------------------------------------------------------------------------
  // Haptics toggle (local MMKV state)
  // ---------------------------------------------------------------------------

  // Use a simple local state synced with MMKV (not synced to server)
  const [hapticsEnabled, setHapticsEnabledState] = useState(getHapticsEnabled);

  const toggleHaptics = useCallback((value: boolean) => {
    setHapticsEnabledState(value);
    setHapticsEnabled(value);
  }, []);

  // ---------------------------------------------------------------------------
  // Unit toggle handler
  // ---------------------------------------------------------------------------

  const handleToggleUnit = useCallback(async () => {
    const newUnit = currentUnit === 'kg' ? 'lb' : 'kg';
    try {
      await db.execute(
        `UPDATE users SET default_unit = ?, updated_at = ? WHERE id = ?`,
        [newUnit, new Date().toISOString(), userId],
      );
    } catch {
      Alert.alert('Error', 'Could not update unit preference.');
    }
  }, [currentUnit, userId, db]);

  // ---------------------------------------------------------------------------
  // Rest timer stepper handlers
  // ---------------------------------------------------------------------------

  const handleRestTimerChange = useCallback(
    async (delta: number) => {
      const newValue = Math.max(15, Math.min(600, currentRestSeconds + delta));
      if (newValue === currentRestSeconds) return;
      try {
        await db.execute(
          `UPDATE users SET default_rest_seconds = ?, updated_at = ? WHERE id = ?`,
          [newValue, new Date().toISOString(), userId],
        );
      } catch {
        Alert.alert('Error', 'Could not update rest timer.');
      }
    },
    [currentRestSeconds, userId, db],
  );

  // ---------------------------------------------------------------------------
  // Destructive actions (stubs for v0)
  // ---------------------------------------------------------------------------

  const handleExportData = useCallback(() => {
    Alert.alert(
      'Export My Data',
      'Data export will be available in a future update. Your data is stored securely and synced to the cloud.',
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Coming Soon',
              'Account deletion will be available in a future update. Please contact support@pulse.fitness for immediate assistance.',
            );
          },
        },
      ],
    );
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          // Reset workout state before signing out to prevent User A's
          // in-progress workout from leaking into User B's session.
          // reset() clears both the Zustand store and the MMKV snapshot.
          workoutStore.getState().reset();

          signOut().catch(() => {
            Alert.alert('Error', 'Could not sign out. Please try again.');
          });
        },
      },
    ]);
  }, [signOut]);

  // ---------------------------------------------------------------------------
  // App version string
  // ---------------------------------------------------------------------------

  const appVersion = Constants.expoConfig?.version ?? '0.1.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber ?? '1'
      : Constants.expoConfig?.android?.versionCode?.toString() ?? '1';
  const osVersion = Platform.OS === 'ios'
    ? `iOS ${Platform.Version}`
    : `Android ${Platform.Version}`;

  // ---------------------------------------------------------------------------
  // User type badge label
  // ---------------------------------------------------------------------------

  const userTypeLabel = useMemo(() => {
    switch (userType) {
      case 'lifter':
        return 'LIFTER';
      case 'trainer':
        return 'TRAINER';
      case 'gym':
        return 'GYM';
      default:
        return 'LIFTER';
    }
  }, [userType]);

  // ---------------------------------------------------------------------------
  // Rest timer display
  // ---------------------------------------------------------------------------

  const restTimerDisplay = useMemo(() => {
    const mins = Math.floor(currentRestSeconds / 60);
    const secs = currentRestSeconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  }, [currentRestSeconds]);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* Header                                                            */}
        {/* ================================================================= */}
        <View className="flex-row items-center justify-between mb-5">
          <Text
            className="text-primary font-medium"
            style={{ fontSize: 22, lineHeight: 28 }}
            accessibilityRole="header"
          >
            Profile
          </Text>
          <IconSettings size={22} color={Colors.label} />
        </View>

        {/* ================================================================= */}
        {/* Identity hero card                                                */}
        {/* ================================================================= */}
        <View className="bg-hero rounded-card-hero p-4 mb-5">
          {/* Avatar + identity */}
          <View className="flex-row items-center mb-4">
            <View className="w-14 h-14 rounded-full bg-stat-tile items-center justify-center mr-4">
              <Text className="text-primary text-title font-medium">
                {initials || '?'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-primary text-subtitle font-medium" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="text-ambient text-body-sm mt-0.5" numberOfLines={1}>
                {email}
              </Text>
              {/* Badges */}
              <View className="flex-row gap-2 mt-2">
                <View className="bg-stat-tile rounded-pill px-2.5 py-0.5">
                  <Text className="text-label text-[10px] font-medium">
                    {userTypeLabel}
                  </Text>
                </View>
                {isPremium && (
                  <View className="bg-amber-bg rounded-pill px-2.5 py-0.5 flex-row items-center gap-1">
                    <IconCrown size={10} color={Colors.amber} />
                    <Text className="text-amber text-[10px] font-medium">
                      PREMIUM
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Stat tiles */}
          <View className="flex-row gap-2">
            <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1 items-center">
              <View className="flex-row items-center gap-1 mb-0.5">
                <IconFlame size={12} color={Colors.amber} />
                <Text className="text-label text-label-xs uppercase tracking-widest">
                  Streak
                </Text>
              </View>
              <Text className="text-primary text-subtitle font-medium">
                {streak}
              </Text>
            </View>
            <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1 items-center">
              <View className="flex-row items-center gap-1 mb-0.5">
                <IconBarbell size={12} color={Colors.label} />
                <Text className="text-label text-label-xs uppercase tracking-widest">
                  Workouts
                </Text>
              </View>
              <Text className="text-primary text-subtitle font-medium">
                {workoutCount}
              </Text>
            </View>
            <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1 items-center">
              <View className="flex-row items-center gap-1 mb-0.5">
                <IconTrophy size={12} color={Colors.amber} />
                <Text className="text-label text-label-xs uppercase tracking-widest">
                  PRs
                </Text>
              </View>
              <Text className="text-primary text-subtitle font-medium">
                {prCount}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* ACCOUNT section                                                   */}
        {/* ================================================================= */}
        <SectionHeader>Account</SectionHeader>
        <View className="bg-card rounded-card px-card-pad border-[0.5px] border-border-subtle">
          <SettingsRow
            icon={<IconBuilding size={16} color={Colors.label} />}
            label="My gyms"
            onPress={() => router.push('/(lifter)/(profile)/my-gyms')}
          />
          <SettingsRow
            icon={<IconCrown size={16} color={Colors.amber} />}
            label="Premium subscription"
            value={isPremium ? (tier === 'trial' ? 'Trial' : 'Active') : 'Free'}
            onPress={() => router.push('/(lifter)/(profile)/subscription')}
          />
          <SettingsRow
            icon={<IconShieldCheck size={16} color={Colors.label} />}
            label="Sign-in & security"
            value="Coming soon"
            disabled
            isLast
          />
        </View>

        {/* ================================================================= */}
        {/* TRAINING section                                                  */}
        {/* ================================================================= */}
        <SectionHeader>Training</SectionHeader>
        <View className="bg-card rounded-card px-card-pad border-[0.5px] border-border-subtle">
          {/* Units toggle */}
          <SettingsRow
            icon={<IconRuler size={16} color={Colors.label} />}
            label="Units"
            onPress={handleToggleUnit}
            trailing={
              <Pressable
                onPress={handleToggleUnit}
                className="bg-stat-tile rounded-pill px-3 py-1.5 flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel={`Switch units to ${currentUnit === 'kg' ? 'imperial' : 'metric'}`}
              >
                <Text
                  className={`text-body-sm font-medium mr-1 ${
                    currentUnit === 'kg' ? 'text-primary' : 'text-ambient/50'
                  }`}
                >
                  kg/cm
                </Text>
                <Text className="text-border-subtle text-body-sm mx-0.5">/</Text>
                <Text
                  className={`text-body-sm font-medium ml-1 ${
                    currentUnit === 'lb' ? 'text-primary' : 'text-ambient/50'
                  }`}
                >
                  lb/in
                </Text>
              </Pressable>
            }
          />

          {/* Rest timer stepper */}
          <SettingsRow
            icon={<IconClock size={16} color={Colors.label} />}
            label="Default rest timer"
            trailing={
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => handleRestTimerChange(-15)}
                  className="w-7 h-7 rounded-btn-sm bg-stat-tile items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Decrease rest timer by 15 seconds"
                >
                  <IconMinus size={14} color={Colors.label} />
                </Pressable>
                <Text className="text-primary text-body-sm font-medium min-w-[40px] text-center">
                  {restTimerDisplay}
                </Text>
                <Pressable
                  onPress={() => handleRestTimerChange(15)}
                  className="w-7 h-7 rounded-btn-sm bg-stat-tile items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Increase rest timer by 15 seconds"
                >
                  <IconPlus size={14} color={Colors.label} />
                </Pressable>
              </View>
            }
          />

          {/* Haptics toggle */}
          <SettingsRow
            icon={<IconVibrate size={16} color={Colors.label} />}
            label="Haptic feedback"
            trailing={
              <Switch
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: Colors.borderSubtle, true: Colors.accent }}
                thumbColor={Colors.primary}
                accessibilityLabel="Toggle haptic feedback"
              />
            }
            isLast
          />
        </View>

        {/* ================================================================= */}
        {/* INTEGRATIONS section                                              */}
        {/* ================================================================= */}
        <SectionHeader>Integrations</SectionHeader>
        <View className="bg-card rounded-card px-card-pad border-[0.5px] border-border-subtle">
          <SettingsRow
            icon={<IconHeartRateMonitor size={16} color={Colors.label} />}
            label={Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'}
            value="Phase 2"
            disabled
            isLast
          />
        </View>

        {/* ================================================================= */}
        {/* DATA & PRIVACY section                                            */}
        {/* ================================================================= */}
        <SectionHeader>Data & Privacy</SectionHeader>
        <View className="bg-card rounded-card px-card-pad border-[0.5px] border-border-subtle">
          <SettingsRow
            icon={<IconDownload size={16} color={Colors.label} />}
            label="Export my data"
            onPress={handleExportData}
          />
          <SettingsRow
            icon={<IconShieldLock size={16} color={Colors.label} />}
            label="Privacy controls"
            value="Coming soon"
            disabled
          />
          <SettingsRow
            icon={<IconTrash size={16} color={Colors.coral} />}
            label="Delete my account"
            onPress={handleDeleteAccount}
            destructive
            isLast
          />
        </View>

        {/* ================================================================= */}
        {/* SUPPORT section                                                   */}
        {/* ================================================================= */}
        <SectionHeader>Support</SectionHeader>
        <View className="bg-card rounded-card px-card-pad border-[0.5px] border-border-subtle">
          <SettingsRow
            icon={<IconHelp size={16} color={Colors.label} />}
            label="Help center"
            value="Coming soon"
            disabled
          />
          <SettingsRow
            icon={<IconMessageCircle size={16} color={Colors.label} />}
            label="Contact support"
            value="Coming soon"
            disabled
            isLast
          />
        </View>

        {/* ================================================================= */}
        {/* Sign out                                                          */}
        {/* ================================================================= */}
        <Pressable
          onPress={handleSignOut}
          className="mt-5 rounded-btn min-h-btn-sm items-center justify-center border border-coral"
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text className="text-coral text-subtitle font-medium">Sign Out</Text>
        </Pressable>

        {/* ================================================================= */}
        {/* Footer: version info                                              */}
        {/* ================================================================= */}
        <Text className="text-label/40 text-[10px] text-center mt-5">
          Pulse v{appVersion} ({buildNumber}) {'\u00B7'} {osVersion}
        </Text>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
