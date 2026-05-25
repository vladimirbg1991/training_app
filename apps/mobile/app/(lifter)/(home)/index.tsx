import { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { IconChevronRight } from '@tabler/icons-react-native';

import { useWorkoutStore } from '@/stores/workout-store';
import { useRoutines } from '@/lib/powersync';
import type { RoutineExerciseConfig } from '@gym-app/domain';
import { Colors } from '@/constants/colors';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateString(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Average rest per set in seconds (used for estimated time). */
const AVG_REST_SECONDS = 90;
/** Average working time per set in seconds. */
const AVG_SET_SECONDS = 40;

interface RoutineRow {
  id: string;
  name: string;
  exercise_config: string | null;
  updated_at: string | null;
}

/**
 * Parse the exercise_config JSON from a routine row.
 * Returns an empty array on any parse failure.
 */
function parseExerciseConfig(raw: string | null): RoutineExerciseConfig[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RoutineExerciseConfig[]) : [];
  } catch {
    return [];
  }
}

/**
 * Estimate workout duration in minutes from exercise configs.
 * Formula: sum of (sets * (working time + rest time)) for each exercise.
 */
function estimateMinutes(configs: RoutineExerciseConfig[]): number {
  let totalSeconds = 0;
  for (const config of configs) {
    const restPerSet = config.restSeconds ?? AVG_REST_SECONDS;
    totalSeconds += config.targetSets * (AVG_SET_SECONDS + restPerSet);
  }
  return Math.max(1, Math.round(totalSeconds / 60));
}

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';
  const displayName = user?.firstName ?? user?.username ?? 'Lifter';
  const initials = (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '');

  const workoutStatus = useWorkoutStore((s) => s.status);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  // -------------------------------------------------------------------------
  // Routines query: newest-updated first
  // -------------------------------------------------------------------------
  const { data: routineRows } = useRoutines(userId) as { data: RoutineRow[] | undefined };
  const routines = routineRows ?? [];
  const topRoutine = routines.length > 0 ? routines[0] : null;

  const topRoutineConfig = useMemo(
    () => (topRoutine ? parseExerciseConfig(topRoutine.exercise_config) : []),
    [topRoutine?.exercise_config],
  );

  const totalSets = useMemo(
    () => topRoutineConfig.reduce((sum, c) => sum + c.targetSets, 0),
    [topRoutineConfig],
  );

  const estMinutes = useMemo(
    () => estimateMinutes(topRoutineConfig),
    [topRoutineConfig],
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /** Start a routine-backed workout -> pre-flight screen. */
  const handleStartRoutine = useCallback(() => {
    if (!topRoutine) return;
    if (workoutStatus === 'active') {
      router.push('/(lifter)/(workout)/active');
      return;
    }
    router.push({
      pathname: '/(lifter)/(workout)/pre-flight',
      params: { routineId: topRoutine.id },
    });
  }, [topRoutine, workoutStatus, router]);

  /** Start an empty workout (fallback when no routines exist). */
  const handleStartEmptyWorkout = useCallback(async () => {
    if (workoutStatus === 'active') {
      router.push('/(lifter)/(workout)/active');
      return;
    }
    if (!userId) return;
    await startWorkout({ userId });
    router.push('/(lifter)/(workout)/active');
  }, [workoutStatus, startWorkout, router, userId]);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Header: date + greeting + avatar */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-1">
            <Text className="text-label text-body-sm">{getDateString()}</Text>
            <Text className="text-primary text-title mt-0.5">
              {getGreeting()}, {displayName}
            </Text>
          </View>
          <View
            className="w-9 h-9 rounded-[11px] bg-hero items-center justify-center"
            accessibilityRole="image"
            accessibilityLabel={`Profile avatar for ${displayName}`}
          >
            <Text className="text-primary text-body-sm font-medium">
              {initials || '?'}
            </Text>
          </View>
        </View>

        {/* ================================================================= */}
        {/* Hero card: today's routine (or fallback)                          */}
        {/* ================================================================= */}
        {topRoutine !== null && topRoutineConfig.length > 0 ? (
          <View className="bg-hero rounded-card-hero p-4 mb-2">
            {/* Top row: label + routine name badge */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-ambient text-label-xs uppercase tracking-widest">
                TODAY {'\u00B7'} {topRoutine.name}
              </Text>
            </View>

            {/* Title */}
            <Text
              className="text-primary text-subtitle font-medium mb-3"
              numberOfLines={2}
              accessibilityRole="header"
            >
              {topRoutine.name}
            </Text>

            {/* Stat tiles */}
            <View className="flex-row gap-2 mb-4">
              <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-0.5">
                  exercises
                </Text>
                <Text className="text-primary text-subtitle font-medium">
                  {topRoutineConfig.length}
                </Text>
              </View>
              <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-0.5">
                  sets
                </Text>
                <Text className="text-primary text-subtitle font-medium">
                  {totalSets}
                </Text>
              </View>
              <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-0.5">
                  est. time
                </Text>
                <Text className="text-primary text-subtitle font-medium">
                  {estMinutes} min
                </Text>
              </View>
            </View>

            {/* Primary CTA */}
            <Pressable
              onPress={handleStartRoutine}
              className="bg-accent rounded-btn min-h-btn items-center justify-center flex-row gap-2"
              accessibilityRole="button"
              accessibilityLabel={
                workoutStatus === 'active'
                  ? 'Resume workout'
                  : `Start ${topRoutine.name}`
              }
            >
              <Text className="text-accent-text text-[14px] font-medium">
                {workoutStatus === 'active' ? 'Resume workout' : `Start ${topRoutine.name}`}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Fallback: no routines — existing "Ready when you are" card */
          <View className="bg-hero rounded-card-hero p-4 mb-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-ambient text-label-xs uppercase tracking-widest">
                TODAY
              </Text>
              <View className="bg-stat-tile px-2 py-0.5 rounded-pill">
                <Text className="text-ambient text-label-xs">no routine set</Text>
              </View>
            </View>
            <Text className="text-primary text-subtitle font-medium mb-3">
              Ready when you are
            </Text>
            <Text className="text-ambient text-body-sm mb-4">
              Start an empty workout or pick a routine to follow.
            </Text>
            <Pressable
              onPress={handleStartEmptyWorkout}
              className="bg-accent rounded-btn min-h-btn items-center justify-center flex-row gap-2"
              accessibilityRole="button"
              accessibilityLabel={workoutStatus === 'active' ? 'Resume workout' : 'Start workout'}
            >
              <Text className="text-accent-text text-[14px] font-medium">
                {workoutStatus === 'active' ? 'Resume workout' : 'Start workout'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* "My routines" link */}
        <Pressable
          onPress={() => router.push('/(lifter)/(library)' as never)}
          className="flex-row items-center justify-between py-2 mb-3"
          accessibilityRole="link"
          accessibilityLabel="View my routines"
        >
          <Text className="text-label text-body-sm">My routines</Text>
          <IconChevronRight size={16} color={Colors.label} />
        </Pressable>

        {/* Secondary actions */}
        <View className="flex-row gap-2 mb-5">
          <Link href="/(lifter)/(workout)" asChild>
            <Pressable
              className="flex-1 h-[42px] rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Start empty workout"
            >
              <Text className="text-ambient text-body-sm">+ Empty workout</Text>
            </Pressable>
          </Link>
          <Link href="/(modals)/qr-scan" asChild>
            <Pressable
              className="flex-1 h-[42px] rounded-btn-sm bg-card border-[0.5px] border-border-subtle items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Scan gym equipment QR code"
            >
              <Text className="text-ambient text-body-sm">Scan equipment</Text>
            </Pressable>
          </Link>
        </View>

        {/* This week summary */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
          THIS WEEK
        </Text>
        <View className="bg-card rounded-card p-card-pad mb-5">
          <View className="flex-row justify-between items-end mb-3">
            <View>
              <Text className="text-primary text-hero-num font-medium" style={{ letterSpacing: -0.5 }}>
                {'\u2014'}
              </Text>
              <Text className="text-label text-label-xs mt-1">
                total volume {'\u00B7'} 0 sessions
              </Text>
            </View>
          </View>
          {/* Week histogram placeholder */}
          <View className="flex-row items-end gap-1 h-8">
            {DAY_LABELS.map((day, i) => (
              <View key={`day-${i}`} className="flex-1 items-center">
                <View className="w-full h-0.5 rounded-sm bg-stat-tile border-[0.5px] border-dashed border-border-subtle" />
                <Text className="text-label text-[9px] mt-1.5">{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent milestones */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
          RECENT MILESTONES
        </Text>
        <View className="bg-card rounded-card p-card-pad mb-4">
          <View className="items-center py-4">
            <Text className="text-ambient text-body-sm">
              Complete your first workout to see milestones here.
            </Text>
          </View>
        </View>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
