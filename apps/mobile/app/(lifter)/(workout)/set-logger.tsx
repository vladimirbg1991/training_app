/**
 * Screen 10/12 — Smart Set Logger
 *
 * The two-tap set logging interface with stepped inputs and implicit-confirm.
 * This is the most critical UI screen in the entire app — every tap here
 * produces data that must be persisted before the confirmation animation plays.
 *
 * Data flow: SteppedInput -> updateDraft -> confirmSet -> SQLite -> haptic -> UI
 */

import { useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@powersync/react-native';
import { IconTrophy, IconFlame, IconEdit, IconSnowflake } from '@tabler/icons-react-native';

import { useWorkoutStore } from '@/stores';
import type { ConfirmedSet } from '@/stores';
import {
  SteppedInput,
  DraftIndicator,
  SetChip,
  WorkoutHeader,
} from '@/components/workout';
import { useElapsedTime, formatElapsed } from '@/hooks/use-elapsed-time';
import { isPRPace } from '@gym-app/fitness-logic';
import { Colors } from '@/constants/colors';

// ============================================================================
// Types
// ============================================================================

interface HistoryRow {
  weight_value: number | null;
  weight_unit: string | null;
  reps: number | null;
  pin_position: number | null;
  is_warmup: number;
  performed_at: string;
}

// ============================================================================
// Component
// ============================================================================

export default function SetLoggerScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';

  // --------------------------------------------------------------------------
  // Store selectors (fine-grained to avoid unnecessary re-renders)
  // --------------------------------------------------------------------------

  const exercises = useWorkoutStore((s) => s.exercises);
  const currentIndex = useWorkoutStore((s) => s.currentExerciseIndex);
  const draft = useWorkoutStore((s) => s.draft);
  const confirmedSets = useWorkoutStore((s) => s.confirmedSets);
  const startedAt = useWorkoutStore((s) => s.startedAt);
  const status = useWorkoutStore((s) => s.status);

  const initDraft = useWorkoutStore((s) => s.initDraft);
  const updateDraft = useWorkoutStore((s) => s.updateDraft);
  const confirmSet = useWorkoutStore((s) => s.confirmSet);

  // --------------------------------------------------------------------------
  // Derived state
  // --------------------------------------------------------------------------

  const currentExercise = exercises[currentIndex] ?? null;
  const exerciseId = currentExercise?.exerciseId ?? '';
  const exerciseSets = confirmedSets[exerciseId] ?? [];
  const targetSets = currentExercise?.targetSets ?? 0;
  const currentSetNumber = exerciseSets.length + 1;

  const elapsed = useElapsedTime(startedAt);
  const elapsedDisplay = formatElapsed(elapsed);

  const progressLabel = currentExercise
    ? `${currentIndex + 1}/${exercises.length}`
    : '';

  // --------------------------------------------------------------------------
  // Exercise history (for PR detection and last-session prefill)
  // --------------------------------------------------------------------------

  const { data: historyData } = useQuery<HistoryRow>(
    userId && exerciseId
      ? `SELECT ws.weight_value, ws.weight_unit, ws.reps, ws.pin_position, ws.is_warmup, ws.performed_at
         FROM workout_sets ws
         JOIN workout_sessions s ON ws.session_id = s.id
         WHERE ws.user_id = ? AND ws.exercise_id = ? AND s.status = 'completed'
         ORDER BY ws.performed_at DESC
         LIMIT 50`
      : `SELECT 1 WHERE 0`,
    userId && exerciseId ? [userId, exerciseId] : [],
  );

  const history: HistoryRow[] = historyData ?? [];

  // Last working set from history (for prefill and hero meta)
  const lastWorkingSet = useMemo(
    () => history.find((h) => h.is_warmup === 0 && h.weight_value !== null),
    [history],
  );

  // --------------------------------------------------------------------------
  // Initialize draft on mount or exercise change
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!currentExercise || status !== 'active') return;

    // If there is already a draft for this exercise, keep it
    if (draft?.exerciseId === exerciseId) return;

    // Prefill from the last working set, or fall back to nulls
    initDraft(
      lastWorkingSet
        ? {
            weightValue: lastWorkingSet.weight_value,
            weightUnit: (lastWorkingSet.weight_unit as 'kg' | 'lb') ?? 'kg',
            reps: lastWorkingSet.reps,
          }
        : undefined,
    );
  }, [exerciseId, status, currentExercise, lastWorkingSet, initDraft, draft?.exerciseId]);

  // --------------------------------------------------------------------------
  // PR pace detection
  // --------------------------------------------------------------------------

  const prPace = useMemo(() => {
    if (!draft?.weightValue || !draft?.reps || history.length === 0) return false;
    return isPRPace(draft.weightValue, draft.reps, history);
  }, [draft?.weightValue, draft?.reps, history]);

  // --------------------------------------------------------------------------
  // Quick-adjust values
  // --------------------------------------------------------------------------

  const weightStep = currentExercise?.weightIncrement ?? 5;
  const weightUnit = currentExercise?.incrementUnit ?? 'kg';
  const currentWeight = draft?.weightValue ?? 0;
  const currentReps = draft?.reps ?? 0;

  const quickDown = Math.max(0, currentWeight - weightStep);
  const quickUp = currentWeight + weightStep;

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleWeightChange = useCallback(
    (newValue: number) => {
      updateDraft({ weightValue: newValue });
    },
    [updateDraft],
  );

  const handleRepsChange = useCallback(
    (newValue: number) => {
      updateDraft({ reps: newValue });
    },
    [updateDraft],
  );

  const handleQuickDown = useCallback(() => {
    updateDraft({ weightValue: quickDown });
    void Haptics.selectionAsync();
  }, [updateDraft, quickDown]);

  const handleQuickUp = useCallback(() => {
    updateDraft({ weightValue: quickUp });
    void Haptics.selectionAsync();
  }, [updateDraft, quickUp]);

  const handleConfirm = useCallback(async () => {
    if (!userId || !draft) return;
    await confirmSet(userId);
  }, [userId, draft, confirmSet]);

  const handleToggleWarmup = useCallback(() => {
    if (!draft) return;
    updateDraft({ isWarmup: !draft.isWarmup });
  }, [draft, updateDraft]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // --------------------------------------------------------------------------
  // Primary button label
  // --------------------------------------------------------------------------

  const primaryLabel = useMemo(() => {
    if (!draft || (draft.weightValue === null && draft.reps === null)) {
      return 'Log set';
    }
    const w = draft.weightValue ?? 0;
    const r = draft.reps ?? 0;
    const unitSuffix = weightUnit === 'pin' ? '' : ` ${weightUnit}`;
    const base = `Log ${w}${unitSuffix} \u00D7 ${r}`;
    return prPace ? `${base} (PR pace)` : base;
  }, [draft, weightUnit, prPace]);

  // --------------------------------------------------------------------------
  // Hero meta line: "Bench press . 80 kg last . 3x8"
  // --------------------------------------------------------------------------

  const heroMeta = useMemo(() => {
    const parts: string[] = [];
    if (lastWorkingSet?.weight_value !== null && lastWorkingSet?.weight_value !== undefined) {
      const u = lastWorkingSet.weight_unit ?? weightUnit;
      parts.push(`${lastWorkingSet.weight_value} ${u} last`);
    }
    if (targetSets > 0 && currentExercise?.targetReps) {
      parts.push(`${targetSets}\u00D7${currentExercise.targetReps}`);
    }
    return parts.join(' \u00B7 ');
  }, [lastWorkingSet, weightUnit, targetSets, currentExercise?.targetReps]);

  // --------------------------------------------------------------------------
  // Guard: no exercise loaded
  // --------------------------------------------------------------------------

  if (!currentExercise) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center">
        <Text className="text-ambient text-body-sm">No exercise selected.</Text>
        <Pressable
          onPress={handleBack}
          className="mt-4 px-4 py-2 bg-card rounded-btn"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-primary text-body-sm">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-page">
      {/* Header: breadcrumb + elapsed time */}
      <WorkoutHeader
        breadcrumb={currentExercise.exerciseName}
        elapsedTime={elapsedDisplay}
        progress={progressLabel}
        onBack={handleBack}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero card: exercise name + meta */}
        <View className="bg-card rounded-card p-card-pad mt-3 mb-4 border-[0.5px] border-border-subtle">
          <Text
            className="text-primary text-title"
            accessibilityRole="header"
            numberOfLines={2}
          >
            {currentExercise.exerciseName}
          </Text>
          {heroMeta.length > 0 && (
            <Text className="text-label text-body-sm mt-1">
              {heroMeta}
            </Text>
          )}
        </View>

        {/* Draft indicator wrapper */}
        <DraftIndicator isDirty={draft?.isDirty ?? false}>
          <View className="p-card-pad">
            {/* Set number + progress dots */}
            <View className="flex-row items-center justify-center mb-5">
              <Text className="text-label text-label-xs uppercase tracking-widest mr-3">
                Set {currentSetNumber}
              </Text>
              <SetProgressDots
                confirmed={exerciseSets.length}
                target={targetSets}
                current={currentSetNumber}
              />
            </View>

            {/* Stepped inputs row: weight + reps */}
            <View className="flex-row justify-evenly mb-5">
              <SteppedInput
                label="Weight"
                value={draft?.weightValue ?? null}
                unit={weightUnit}
                step={weightStep}
                stepLabel={`step ${weightStep} ${weightUnit}`}
                onChange={handleWeightChange}
                minValue={0}
                maxValue={999}
              />
              <SteppedInput
                label="Reps"
                value={draft?.reps ?? null}
                unit="rep"
                step={1}
                stepLabel="step 1"
                onChange={handleRepsChange}
                minValue={0}
                maxValue={999}
              />
            </View>

            {/* Primary confirm button */}
            <Pressable
              onPress={handleConfirm}
              disabled={!draft || (draft.weightValue === null && draft.reps === null)}
              className={`min-h-btn rounded-btn items-center justify-center flex-row ${
                prPace ? 'bg-amber' : 'bg-accent'
              } ${!draft || (draft.weightValue === null && draft.reps === null) ? 'opacity-40' : ''}`}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              accessibilityState={{ disabled: !draft }}
            >
              {prPace && (
                <IconTrophy size={18} color={prPace ? Colors.amberText : Colors.accentText} />
              )}
              <Text
                className={`text-subtitle ml-1 ${
                  prPace ? 'text-amber-text' : 'text-accent-text'
                }`}
              >
                {primaryLabel}
              </Text>
            </Pressable>

            {/* Quick-adjust buttons */}
            <View className="flex-row justify-between mt-3 gap-3">
              <Pressable
                onPress={handleQuickDown}
                className="flex-1 bg-stat-tile rounded-btn min-h-tap items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Set weight to ${quickDown} ${weightUnit}`}
              >
                <Text className="text-ambient text-body-sm">
                  {quickDown} {weightUnit}
                </Text>
                <Text className="text-label text-[10px]">
                  {'\u2212'}{weightStep}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleQuickUp}
                className="flex-1 bg-stat-tile rounded-btn min-h-tap items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={`Set weight to ${quickUp} ${weightUnit}`}
              >
                <Text className="text-ambient text-body-sm">
                  {quickUp} {weightUnit}
                </Text>
                <Text className="text-label text-[10px]">
                  +{weightStep}
                </Text>
              </Pressable>
            </View>

            {/* Footer actions: warmup toggle + edit (future) */}
            <View className="flex-row items-center justify-center mt-4 gap-6">
              <Pressable
                onPress={handleToggleWarmup}
                className="flex-row items-center px-3 py-2"
                accessibilityRole="button"
                accessibilityState={{ selected: draft?.isWarmup ?? false }}
                accessibilityLabel={
                  draft?.isWarmup ? 'Mark as working set' : 'Mark as warmup'
                }
              >
                <IconSnowflake
                  size={16}
                  color={draft?.isWarmup ? Colors.amber : Colors.label}
                />
                <Text
                  className={`text-body-sm ml-1.5 ${
                    draft?.isWarmup ? 'text-amber' : 'text-label'
                  }`}
                >
                  warmup
                </Text>
              </Pressable>

              <Pressable
                className="flex-row items-center px-3 py-2 opacity-40"
                accessibilityRole="button"
                accessibilityLabel="Edit set details"
                accessibilityHint="Coming soon"
                disabled
              >
                <IconEdit size={16} color={Colors.label} />
                <Text className="text-label text-body-sm ml-1.5">edit</Text>
              </Pressable>

              <Pressable
                className="flex-row items-center px-3 py-2 opacity-40"
                accessibilityRole="button"
                accessibilityLabel="Log as failure set"
                accessibilityHint="Coming soon"
                disabled
              >
                <IconFlame size={16} color={Colors.label} />
                <Text className="text-label text-body-sm ml-1.5">failure</Text>
              </Pressable>
            </View>
          </View>
        </DraftIndicator>

        {/* Confirmed sets list */}
        {exerciseSets.length > 0 && (
          <View className="mt-5">
            <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
              Completed sets
            </Text>
            {[...exerciseSets].reverse().map((set) => (
              <ConfirmedSetRow key={set.id} set={set} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Set progress dots
// ============================================================================

function SetProgressDots({
  confirmed,
  target,
  current,
}: {
  confirmed: number;
  target: number;
  current: number;
}) {
  // Show at least as many dots as the target, or confirmed+1 if over target
  const total = Math.max(target, confirmed + 1);

  return (
    <View className="flex-row items-center gap-1.5" accessibilityLabel={`Set ${current} of ${target}`}>
      {Array.from({ length: total }, (_, i) => {
        const dotIndex = i + 1;
        const isConfirmed = dotIndex <= confirmed;
        const isCurrent = dotIndex === current;

        let dotClass = 'w-2 h-2 rounded-full';
        if (isConfirmed) {
          dotClass += ' bg-accent';
        } else if (isCurrent) {
          dotClass += ' bg-label';
        } else {
          dotClass += ' bg-stat-tile';
        }

        return <View key={dotIndex} className={dotClass} />;
      })}
    </View>
  );
}

// ============================================================================
// Confirmed set row
// ============================================================================

function ConfirmedSetRow({ set }: { set: ConfirmedSet }) {
  const weightDisplay = set.weightValue !== null ? String(set.weightValue) : '\u2014';
  const repsDisplay = set.reps !== null ? String(set.reps) : '\u2014';

  return (
    <View
      className="flex-row items-center bg-card rounded-btn-sm px-3 py-2.5 mb-1.5 border-[0.5px] border-border-subtle"
      accessibilityLabel={`Set ${set.setIndex + 1}: ${weightDisplay} ${set.weightUnit} for ${repsDisplay} reps${set.isWarmup ? ', warmup' : ''}${set.isPersonalRecord ? ', personal record' : ''}`}
    >
      {/* Set number */}
      <View className="w-[26px] h-[26px] bg-stat-tile rounded-[8px] items-center justify-center mr-3">
        <Text className="text-ambient text-[11px]">{set.setIndex + 1}</Text>
      </View>

      {/* Set details */}
      <View className="flex-1 flex-row items-center">
        {set.isWarmup && (
          <Text className="text-amber text-[10px] mr-1.5">W</Text>
        )}
        <SetChip
          weight={set.weightValue}
          unit={set.weightUnit}
          reps={set.reps}
          isPersonalRecord={set.isPersonalRecord}
          isWarmup={set.isWarmup}
        />
      </View>

      {/* Timestamp (relative) */}
      <Text className="text-label text-[10px]">
        {formatSetTime(set.performedAt)}
      </Text>
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatSetTime(isoString: string): string {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}
