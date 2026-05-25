import { useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useWorkoutStore } from '@/stores/workout-store';
import { useRestTimer } from '@/hooks/use-rest-timer';
import { RestTimerRing } from '@/components/workout/RestTimerRing';

// =============================================================================
// Constants
// =============================================================================

const RING_SIZE = 220;
const AUTO_DISMISS_MS = 2_000;

// =============================================================================
// Screen 18 — Full-screen Rest Timer (modal)
//
// Opens over the active workout screen. Shows a large progress ring, the
// "up next" set preview, and skip / +30s controls. Auto-dismisses with
// haptic feedback when the timer expires.
// =============================================================================

export default function RestTimerScreen() {
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Store selectors
  // ---------------------------------------------------------------------------
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const exercises = useWorkoutStore((s) => s.exercises);
  const currentIndex = useWorkoutStore((s) => s.currentExerciseIndex);
  const confirmedSets = useWorkoutStore((s) => s.confirmedSets);

  const skipRest = useWorkoutStore((s) => s.skipRest);
  const extendRest = useWorkoutStore((s) => s.extendRest);

  // ---------------------------------------------------------------------------
  // Timer hook
  // ---------------------------------------------------------------------------
  const { progress, isExpired, formattedTime } = useRestTimer(
    restTimer.isActive,
    restTimer.startedAt,
    restTimer.targetSeconds,
  );

  // ---------------------------------------------------------------------------
  // Derived: "Up next" card
  // ---------------------------------------------------------------------------
  const currentExercise = exercises[currentIndex] ?? null;
  const exerciseSets = currentExercise
    ? (confirmedSets[currentExercise.exerciseId] ?? [])
    : [];
  const nextSetIndex = exerciseSets.length + 1;

  // Pre-fill from last confirmed set (or null for first set)
  const lastConfirmedSet =
    exerciseSets.length > 0
      ? exerciseSets[exerciseSets.length - 1]!
      : null;

  const prefillWeight = lastConfirmedSet?.weightValue ?? null;
  const prefillWeightUnit = lastConfirmedSet?.weightUnit ?? 'kg';
  const prefillReps = lastConfirmedSet?.reps ?? currentExercise?.targetReps ?? null;

  // ---------------------------------------------------------------------------
  // Target time label (e.g. "of 2:00")
  // ---------------------------------------------------------------------------
  const targetMinutes = Math.floor(restTimer.targetSeconds / 60);
  const targetSecondsRemainder = restTimer.targetSeconds % 60;
  const targetLabel = `of ${targetMinutes}:${String(targetSecondsRemainder).padStart(2, '0')}`;

  // ---------------------------------------------------------------------------
  // Breadcrumb context
  // ---------------------------------------------------------------------------
  const breadcrumb = currentExercise
    ? `Set ${nextSetIndex} \u00B7 ${currentExercise.exerciseName}`
    : 'Rest';

  // ---------------------------------------------------------------------------
  // Auto-dismiss when timer expires
  // ---------------------------------------------------------------------------
  const hasFiredExpiry = useRef(false);

  useEffect(() => {
    if (!isExpired || hasFiredExpiry.current) return;
    hasFiredExpiry.current = true;

    // Haptic notification — the user feels the timer is done
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const timeout = setTimeout(() => {
      router.back();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timeout);
  }, [isExpired, router]);

  // Reset the ref when timer restarts (e.g. after +30s extends past expiry)
  useEffect(() => {
    if (!isExpired) {
      hasFiredExpiry.current = false;
    }
  }, [isExpired]);

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  const handleCollapse = useCallback(() => {
    router.back();
  }, [router]);

  const handleSkip = useCallback(() => {
    skipRest();
    router.back();
  }, [skipRest, router]);

  const handleExtend30 = useCallback(() => {
    extendRest(30);
  }, [extendRest]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1">
        {/* Top bar: collapse + breadcrumb */}
        <View className="flex-row items-center px-4 py-2">
          <Pressable
            onPress={handleCollapse}
            className="w-[44px] h-[44px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Collapse rest timer"
          >
            <Text className="text-label text-subtitle">{'\u2193'}</Text>
          </Pressable>
          <Text
            className="text-label text-body-sm flex-1 text-center mr-[44px]"
            numberOfLines={1}
          >
            {breadcrumb}
          </Text>
        </View>

        {/* Center: progress ring */}
        <View className="flex-1 items-center justify-center">
          <View className="items-center">
            <RestTimerRing
              size={RING_SIZE}
              progress={progress}
              timeLabel={formattedTime}
              showLabel
            />
            <Text className="text-ambient text-body-sm mt-2">{targetLabel}</Text>

            {isExpired && (
              <Text className="text-accent text-subtitle font-medium mt-3">
                Time's up!
              </Text>
            )}
          </View>
        </View>

        {/* Up next card */}
        {currentExercise && (
          <View className="mx-4 mb-4 bg-card rounded-card p-card-pad">
            <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
              UP NEXT
            </Text>
            <Text className="text-primary text-subtitle font-medium mb-2" numberOfLines={1}>
              Set {nextSetIndex} &middot; {currentExercise.exerciseName}
            </Text>
            <View className="flex-row gap-2">
              {prefillWeight !== null && (
                <View className="bg-stat-tile rounded-btn-sm px-3 py-1.5">
                  <Text className="text-ambient text-body-sm">
                    {prefillWeight} {prefillWeightUnit}
                  </Text>
                </View>
              )}
              {prefillReps !== null && (
                <View className="bg-stat-tile rounded-btn-sm px-3 py-1.5">
                  <Text className="text-ambient text-body-sm">
                    {'\u00D7'} {prefillReps} reps
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Insight line */}
        <View className="px-4 mb-4">
          <Text className="text-ambient text-body-sm text-center">
            {restTimer.targetSeconds >= 120
              ? `${targetMinutes}-min rest matches your avg for ${restTimer.label}`
              : `${restTimer.targetSeconds}s rest for ${restTimer.label}`}
          </Text>
        </View>

        {/* Bottom controls */}
        <View className="flex-row items-center px-4 pb-4 gap-3">
          <Pressable
            onPress={handleExtend30}
            className="h-[48px] px-5 bg-stat-tile rounded-btn items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Add 30 seconds to rest timer"
          >
            <Text className="text-ambient text-[14px] font-medium">+30s</Text>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            className="flex-1 h-[48px] bg-accent rounded-btn items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={`Skip rest and start set ${nextSetIndex}`}
          >
            <Text className="text-accent-text text-[14px] font-medium">
              Skip {'\u00B7'} start set {nextSetIndex}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
