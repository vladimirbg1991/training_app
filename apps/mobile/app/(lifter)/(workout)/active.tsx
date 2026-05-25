import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { useQuery } from '@powersync/react-native';

import { useWorkoutStore } from '@/stores/workout-store';
import { useElapsedTime, formatElapsed } from '@/hooks/use-elapsed-time';
import { useRestTimer } from '@/hooks/use-rest-timer';
import { WorkoutHeader } from '@/components/workout/WorkoutHeader';
import { ExerciseQueue } from '@/components/workout/ExerciseQueue';
import { CompletedExercise } from '@/components/workout/CompletedExercise';
import { RestTimerInline } from '@/components/workout/RestTimerInline';
import { WorkoutSummary } from '@/components/workout/WorkoutSummary';
import { UndoBar } from '@/components/workout/UndoBar';

// =============================================================================
// Constants
// =============================================================================

const UNDO_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes — matches store ring buffer TTL

// =============================================================================
// Screen 3 — Active Workout
//
// Three states:
//   1. Just started (no confirmed sets) — hero card for the first exercise
//   2. Mid-workout — completed exercises + rest timer + next exercise hero
//   3. Post-workout summary (status === 'completing') — WorkoutSummary
// =============================================================================

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';

  // User preferred unit
  const { data: userRows } = useQuery(
    userId
      ? `SELECT default_unit FROM users WHERE id = ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  ) as { data: Array<{ default_unit: string }> | undefined };
  const preferredUnit = (userRows?.[0]?.default_unit as 'kg' | 'lb') ?? 'kg';

  // ---------------------------------------------------------------------------
  // Fine-grained store selectors (one per value — Zustand re-renders only
  // when the specific slice changes)
  // ---------------------------------------------------------------------------
  const status = useWorkoutStore((s) => s.status);
  const sessionId = useWorkoutStore((s) => s.sessionId);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const exercises = useWorkoutStore((s) => s.exercises);
  const currentIndex = useWorkoutStore((s) => s.currentExerciseIndex);
  const confirmedSets = useWorkoutStore((s) => s.confirmedSets);
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const discardedDrafts = useWorkoutStore((s) => s.discardedDrafts);
  const totalVolume = useWorkoutStore((s) => s.totalVolume);
  const totalSets = useWorkoutStore((s) => s.totalSets);
  const durationSeconds = useWorkoutStore((s) => s.durationSeconds);
  const detectedPRs = useWorkoutStore((s) => s.detectedPRs);

  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const nextExercise = useWorkoutStore((s) => s.nextExercise);
  const skipRest = useWorkoutStore((s) => s.skipRest);
  const beginFinish = useWorkoutStore((s) => s.beginFinish);
  const saveWorkout = useWorkoutStore((s) => s.saveWorkout);
  const undoDiscard = useWorkoutStore((s) => s.undoDiscard);

  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const elapsedSeconds = useElapsedTime(startedAt);
  const restTimerData = useRestTimer(
    restTimer.isActive,
    restTimer.startedAt,
    restTimer.targetSeconds,
  );

  // ---------------------------------------------------------------------------
  // Local state — post-workout effort selection
  // ---------------------------------------------------------------------------
  const [selectedEffort, setSelectedEffort] = useState<number | null>(null);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const currentExercise = exercises[currentIndex] ?? null;

  const completedExercises = useMemo(
    () => exercises.slice(0, currentIndex),
    [exercises, currentIndex],
  );

  const upcomingExercises = useMemo(
    () => exercises.slice(currentIndex + 1),
    [exercises, currentIndex],
  );

  const confirmedSetCount = useMemo(() => {
    let count = 0;
    for (const sets of Object.values(confirmedSets)) {
      count += sets.length;
    }
    return count;
  }, [confirmedSets]);

  /** Most recent discarded draft, if it's still within the undo window. */
  const recentDiscard = useMemo(() => {
    if (discardedDrafts.length === 0) return null;
    const latest = discardedDrafts[0]!;
    if (Date.now() - latest.discardedAt > UNDO_EXPIRY_MS) return null;
    return latest;
  }, [discardedDrafts]);

  /** Whether all exercises have been completed (all sets logged for each). */
  const allExercisesComplete = useMemo(() => {
    if (exercises.length === 0) return false;
    return exercises.every((ex) => {
      const sets = confirmedSets[ex.exerciseId] ?? [];
      return sets.length >= ex.targetSets;
    });
  }, [exercises, confirmedSets]);

  const isOnLastExercise = currentIndex >= exercises.length - 1;

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    if (status === 'active') {
      Alert.alert(
        'Leave workout?',
        'Your progress is saved. You can resume from the Workout tab.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [router, status]);

  const handleStartSet = useCallback(() => {
    router.push('/(lifter)/(workout)/set-logger');
  }, [router]);

  const handleAddExercise = useCallback(() => {
    router.push('/(lifter)/(workout)/exercise-selector');
  }, [router]);

  const handleFinishWorkout = useCallback(() => {
    Alert.alert(
      'Finish workout?',
      'This will end the current session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            // Transition to summary UI. Does NOT write to SQLite yet —
            // that happens in handleSaveWorkout after the user picks effort.
            beginFinish();
          },
        },
      ],
    );
  }, [beginFinish]);

  const handleSaveWorkout = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    await saveWorkout(userId, selectedEffort ?? undefined);
    router.replace('/(lifter)/(workout)');
  }, [saveWorkout, selectedEffort, router, user?.id]);

  const handleAddNote = useCallback(() => {
    // TODO: Navigate to note editor modal
  }, []);

  const handleSkipRest = useCallback(() => {
    skipRest();
  }, [skipRest]);

  const handleUndoDismiss = useCallback(() => {
    // UndoBar auto-hides — no action needed on dismiss
  }, []);

  const handleStartEmptyWorkout = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    await startWorkout({ userId });
  }, [startWorkout, user?.id]);

  // ===========================================================================
  // Render: No active workout
  // ===========================================================================
  if (status === 'idle' || !sessionId) {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-primary text-title font-medium mb-2">
            No active workout
          </Text>
          <Text className="text-ambient text-body-sm text-center mb-6">
            Start a workout from the Workout tab or begin an empty session below.
          </Text>
          <Pressable
            onPress={handleStartEmptyWorkout}
            className="bg-accent min-h-btn rounded-btn px-8 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Start empty workout"
          >
            <Text className="text-accent-text text-[14px] font-medium">
              Start workout
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===========================================================================
  // Render: Post-workout summary (status === 'completing')
  // ===========================================================================
  if (status === 'completing' || status === 'completed') {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10 pt-8"
          showsVerticalScrollIndicator={false}
        >
          <WorkoutSummary
            totalVolume={totalVolume}
            totalSets={totalSets}
            durationSeconds={durationSeconds}
            avgRPE={null}
            detectedPRs={detectedPRs}
            selectedEffort={selectedEffort}
            onSelectEffort={setSelectedEffort}
            onSave={handleSaveWorkout}
            onAddNote={handleAddNote}
            weightUnit={preferredUnit}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ===========================================================================
  // Render: Active workout (State 1: just started, State 2: mid-workout)
  // ===========================================================================
  const breadcrumb = currentExercise
    ? `exercise ${currentIndex + 1} of ${exercises.length}`
    : `${exercises.length} exercises`;

  const targetFormatted = currentExercise
    ? `${currentExercise.targetSets} \u00D7 ${currentExercise.targetReps}`
    : '';

  // Determine the "last best" text for the hero card (last confirmed set for this exercise)
  const currentExerciseSets = currentExercise
    ? (confirmedSets[currentExercise.exerciseId] ?? [])
    : [];
  const lastSet = currentExerciseSets.length > 0
    ? currentExerciseSets[currentExerciseSets.length - 1]!
    : null;
  const lastBestLabel = lastSet
    ? `${lastSet.weightValue ?? '\u2014'} \u00D7 ${lastSet.reps ?? '\u2014'}`
    : null;

  const heroLabel = confirmedSetCount === 0
    ? 'UP FIRST'
    : 'UP NEXT';

  const actionLabel = confirmedSetCount === 0 && currentExercise
    ? 'Begin first set'
    : currentExercise
      ? `Start ${currentExercise.exerciseName.toLowerCase()}`
      : 'Start set';

  return (
    <SafeAreaView className="flex-1 bg-page">
      {/* Header */}
      <WorkoutHeader
        breadcrumb={breadcrumb}
        elapsedTime={formatElapsed(elapsedSeconds)}
        progress={`${confirmedSetCount} sets done`}
        onBack={handleBack}
        onMenu={handleFinishWorkout}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* Completed exercises (rendered above the current exercise)         */}
        {/* ================================================================= */}
        {completedExercises.map((ex) => {
          const sets = confirmedSets[ex.exerciseId] ?? [];
          return (
            <CompletedExercise
              key={ex.exerciseId}
              exerciseName={ex.exerciseName}
              sets={sets.map((s) => ({
                weight: s.weightValue,
                unit: s.weightUnit,
                reps: s.reps,
                isPersonalRecord: s.isPersonalRecord,
              }))}
            />
          );
        })}

        {/* ================================================================= */}
        {/* Undo bar (most recent discarded draft)                            */}
        {/* ================================================================= */}
        {recentDiscard && (
          <View className="mb-2">
            <UndoBar
              message={`Set ${recentDiscard.sourceSetIndex + 1} discarded`}
              onUndo={undoDiscard}
              onDismiss={handleUndoDismiss}
            />
          </View>
        )}

        {/* ================================================================= */}
        {/* Rest timer inline (between completed exercises and hero card)     */}
        {/* ================================================================= */}
        {restTimer.isActive && !restTimerData.isExpired && (
          <Pressable
            onPress={() => router.push('/(modals)/rest-timer')}
            accessibilityRole="button"
            accessibilityLabel={`Rest timer: ${restTimerData.formattedTime} remaining. Tap to expand.`}
          >
            <RestTimerInline
              progress={restTimerData.progress}
              timeLabel={restTimerData.formattedTime}
              targetLabel={`resting \u00B7 ${Math.floor(restTimer.targetSeconds / 60)}:${String(restTimer.targetSeconds % 60).padStart(2, '0')} target`}
              onSkip={handleSkipRest}
            />
          </Pressable>
        )}

        {/* ================================================================= */}
        {/* Hero card: current exercise                                       */}
        {/* ================================================================= */}
        {currentExercise && (
          <View className="bg-hero rounded-card-hero p-4 mb-3">
            <Text className="text-ambient text-label-xs uppercase tracking-widest mb-1">
              {heroLabel}
            </Text>
            <Text
              className="text-primary text-title font-medium mb-3"
              numberOfLines={2}
              accessibilityRole="header"
            >
              {currentExercise.exerciseName}
            </Text>

            {/* Target + Last best row */}
            <View className="flex-row gap-2 mb-4">
              {/* Target tile */}
              <View className="bg-stat-tile rounded-btn-sm px-3 py-2">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-0.5">
                  target
                </Text>
                <Text className="text-primary text-subtitle font-medium">
                  {targetFormatted}
                </Text>
              </View>

              {/* Last best tile */}
              {lastBestLabel && (
                <View className="bg-stat-tile rounded-btn-sm px-3 py-2">
                  <Text className="text-label text-label-xs uppercase tracking-widest mb-0.5">
                    last best
                  </Text>
                  <Text className="text-primary text-subtitle font-medium">
                    {lastBestLabel}
                  </Text>
                </View>
              )}
            </View>

            {/* Action button */}
            <Pressable
              onPress={handleStartSet}
              className="bg-accent min-h-btn rounded-btn items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
            >
              <Text className="text-accent-text text-[14px] font-medium">
                {actionLabel}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ================================================================= */}
        {/* "No exercises" state (workout started but no exercises added)     */}
        {/* ================================================================= */}
        {exercises.length === 0 && (
          <View className="bg-card rounded-card p-card-pad items-center mb-3">
            <Text className="text-primary text-subtitle mb-1">
              No exercises yet
            </Text>
            <Text className="text-ambient text-body-sm text-center mb-3">
              Add exercises to start logging sets.
            </Text>
          </View>
        )}

        {/* ================================================================= */}
        {/* Up next queue                                                     */}
        {/* ================================================================= */}
        {upcomingExercises.length > 0 && (
          <View className="mb-3">
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2 mt-1">
              UP NEXT
            </Text>
            <ExerciseQueue
              exercises={upcomingExercises}
              startIndex={currentIndex + 2}
            />
          </View>
        )}

        {/* ================================================================= */}
        {/* Add exercise button                                               */}
        {/* ================================================================= */}
        <Pressable
          onPress={handleAddExercise}
          className="min-h-btn rounded-btn items-center justify-center border border-dashed border-border-subtle mb-4"
          accessibilityRole="button"
          accessibilityLabel="Add exercise to workout"
        >
          <Text className="text-label text-[14px]">+ Add exercise</Text>
        </Pressable>

        {/* ================================================================= */}
        {/* Finish workout button (visible on last exercise or all complete)  */}
        {/* ================================================================= */}
        {(isOnLastExercise || allExercisesComplete) && confirmedSetCount > 0 && (
          <Pressable
            onPress={handleFinishWorkout}
            className="bg-card border border-border-subtle min-h-btn rounded-btn items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Finish workout"
          >
            <Text className="text-primary text-[14px] font-medium">
              Finish workout
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
