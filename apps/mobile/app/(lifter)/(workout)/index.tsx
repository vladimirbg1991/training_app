import { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';

import { useWorkoutStore } from '@/stores/workout-store';
import { useElapsedTime, formatElapsed } from '@/hooks/use-elapsed-time';

// =============================================================================
// Workout Tab — Landing Page
//
// If an active workout exists, show a prominent "Resume workout" card with
// elapsed time. Otherwise, show "Start empty workout" and navigation links.
// =============================================================================

export default function WorkoutScreen() {
  const router = useRouter();
  const { user } = useUser();

  const status = useWorkoutStore((s) => s.status);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const exercises = useWorkoutStore((s) => s.exercises);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const elapsedSeconds = useElapsedTime(
    status === 'active' ? startedAt : null,
  );

  const isActive = status === 'active';

  const handleStartEmpty = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    await startWorkout({ userId });
    router.push('/(lifter)/(workout)/active');
  }, [startWorkout, router, user?.id]);

  const handleResume = useCallback(() => {
    router.push('/(lifter)/(workout)/active');
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Workout Tab
        </Text>
        <Text className="text-primary text-title mb-2">Workout</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Start a new workout, pick a routine, or continue where you left off.
        </Text>

        {/* ================================================================= */}
        {/* Resume card (visible only when a workout is in progress)          */}
        {/* ================================================================= */}
        {isActive && (
          <Pressable
            onPress={handleResume}
            className="bg-hero rounded-card-hero p-4 mb-card-gap"
            accessibilityRole="button"
            accessibilityLabel={`Resume workout. ${formatElapsed(elapsedSeconds)} elapsed, ${exercises.length} exercises.`}
          >
            <Text className="text-ambient text-label-xs uppercase tracking-widest mb-1">
              IN PROGRESS
            </Text>
            <Text className="text-primary text-subtitle font-medium mb-1">
              Resume workout
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="bg-stat-tile rounded-btn-sm px-2.5 py-1">
                <Text className="text-primary text-body-sm font-medium">
                  {formatElapsed(elapsedSeconds)}
                </Text>
              </View>
              <Text className="text-ambient text-body-sm">
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </Pressable>
        )}

        {/* ================================================================= */}
        {/* Start empty workout (always visible when no workout is active)   */}
        {/* ================================================================= */}
        {!isActive && (
          <Pressable
            onPress={handleStartEmpty}
            className="bg-accent rounded-card p-card-pad mb-card-gap items-center"
            accessibilityRole="button"
            accessibilityLabel="Start empty workout"
          >
            <Text className="text-accent-text text-subtitle font-medium">
              Start Empty Workout
            </Text>
          </Pressable>
        )}

        {/* ================================================================= */}
        {/* Navigation links                                                  */}
        {/* ================================================================= */}
        <Link href="/(lifter)/(workout)/exercise-selector" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-card-gap"
            accessibilityRole="button"
            accessibilityLabel="Open exercise selector"
          >
            <Text className="text-primary text-subtitle">Exercise Selector</Text>
            <Text className="text-label text-body-sm">
              Browse and add exercises to your workout
            </Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(workout)/set-logger" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-card-gap"
            accessibilityRole="button"
            accessibilityLabel="Open set logger"
          >
            <Text className="text-primary text-subtitle">Set Logger</Text>
            <Text className="text-label text-body-sm">
              The two-tap set logging interface
            </Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(workout)/pre-flight" asChild>
          <Pressable
            className="bg-card rounded-card p-card-pad mb-card-gap"
            accessibilityRole="button"
            accessibilityLabel="Open pre-flight check"
          >
            <Text className="text-primary text-subtitle">Pre-flight Check</Text>
            <Text className="text-label text-body-sm">
              Review before starting a routine
            </Text>
          </Pressable>
        </Link>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
