/**
 * Screen 16 — Pre-flight Check
 *
 * Equipment/exercise readiness check shown before starting a routine-backed
 * workout. In v0 all exercises are marked "ready" because we don't yet have
 * gym equipment instance tracking. The screen serves as a confirmation step
 * so the user can review the planned exercises and estimated stats before
 * committing to a session.
 *
 * Data flow:
 *   1. Receives routineId via route params
 *   2. Loads the routine row from SQLite (via useRoutine hook)
 *   3. Parses exercise_config JSONB to get the exercise list
 *   4. Resolves exercise names from the exercises table
 *   5. On "Start now", builds WorkoutExercise[] and calls startWorkout
 *   6. Navigates to the active workout screen
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { usePowerSync } from '@powersync/react-native';
import {
  IconChevronLeft,
  IconCircleCheckFilled,
  IconClock,
  IconBarbell,
  IconTarget,
} from '@tabler/icons-react-native';

import { useRoutine } from '@/lib/powersync';
import { useWorkoutStore } from '@/stores/workout-store';
import type { WorkoutExercise } from '@/stores/workout-store';
import { resolveIncrement, parseExerciseConfig, estimateMinutes } from '@/lib/workout';
import { Colors } from '@/constants/colors';
import type { RoutineExerciseConfig } from '@gym-app/domain';

// ============================================================================
// Types
// ============================================================================

interface RoutineRow {
  id: string;
  name: string;
  description: string | null;
  exercise_config: string | null;
  user_id: string;
}

interface ExerciseRow {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  equipment_id: string | null;
}

interface EquipmentRow {
  id: string;
  name: string;
  category: string | null;
}

interface ResolvedExercise {
  config: RoutineExerciseConfig;
  name: string;
  equipmentName: string | null;
  equipmentCategory: string | null;
}

// ============================================================================
// Component
// ============================================================================

export default function PreFlightScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';
  const db = usePowerSync();

  const { routineId } = useLocalSearchParams<{ routineId: string }>();

  // -------------------------------------------------------------------------
  // Load routine
  // -------------------------------------------------------------------------
  const routineResult = useRoutine(routineId);
  const routine = (routineResult.data as RoutineRow[] | undefined)?.[0] ?? null;

  const exerciseConfigs = useMemo(
    () => parseExerciseConfig(routine?.exercise_config ?? null),
    [routine?.exercise_config],
  );

  // -------------------------------------------------------------------------
  // Resolve exercise names + equipment from SQLite
  // -------------------------------------------------------------------------
  const [resolvedExercises, setResolvedExercises] = useState<ResolvedExercise[]>([]);
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    if (exerciseConfigs.length === 0) {
      setResolvedExercises([]);
      setIsResolving(false);
      return;
    }

    let cancelled = false;

    const resolve = async (): Promise<void> => {
      try {
        // Batch-load exercise rows
        const exerciseIds = exerciseConfigs.map((c) => c.exerciseId);
        const placeholders = exerciseIds.map(() => '?').join(', ');
        const exerciseRows = await db.getAll<ExerciseRow>(
          `SELECT id, name, body_part, target_muscle, equipment_id FROM exercises WHERE id IN (${placeholders})`,
          exerciseIds,
        );

        // Build a lookup map
        const exerciseMap = new Map<string, ExerciseRow>();
        for (const row of exerciseRows) {
          exerciseMap.set(row.id, row);
        }

        // Collect unique equipment IDs for a second batch query
        const equipmentIds = [
          ...new Set(
            exerciseRows
              .map((r) => r.equipment_id)
              .filter((id): id is string => id !== null),
          ),
        ];

        const equipmentMap = new Map<string, EquipmentRow>();
        if (equipmentIds.length > 0) {
          const eqPlaceholders = equipmentIds.map(() => '?').join(', ');
          const equipmentRows = await db.getAll<EquipmentRow>(
            `SELECT id, name, category FROM equipment WHERE id IN (${eqPlaceholders})`,
            equipmentIds,
          );
          for (const row of equipmentRows) {
            equipmentMap.set(row.id, row);
          }
        }

        if (cancelled) return;

        // Merge configs with resolved names
        const resolved: ResolvedExercise[] = exerciseConfigs.map((config) => {
          const exercise = exerciseMap.get(config.exerciseId);
          const equipment = exercise?.equipment_id
            ? equipmentMap.get(exercise.equipment_id)
            : null;

          return {
            config,
            name: exercise?.name ?? 'Unknown exercise',
            equipmentName: equipment?.name ?? null,
            equipmentCategory: equipment?.category ?? null,
          };
        });

        setResolvedExercises(resolved);
      } catch {
        // On failure, show config IDs as placeholders rather than crashing
        if (!cancelled) {
          setResolvedExercises(
            exerciseConfigs.map((config) => ({
              config,
              name: 'Exercise',
              equipmentName: null,
              equipmentCategory: null,
            })),
          );
        }
      } finally {
        if (!cancelled) {
          setIsResolving(false);
        }
      }
    };

    setIsResolving(true);
    resolve();

    return () => {
      cancelled = true;
    };
  }, [db, exerciseConfigs]);

  // -------------------------------------------------------------------------
  // Derived stats
  // -------------------------------------------------------------------------
  const totalSets = useMemo(
    () => exerciseConfigs.reduce((sum, c) => sum + c.targetSets, 0),
    [exerciseConfigs],
  );

  const estMinutes = useMemo(
    () => estimateMinutes(exerciseConfigs),
    [exerciseConfigs],
  );

  // -------------------------------------------------------------------------
  // Workout store
  // -------------------------------------------------------------------------
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const workoutStatus = useWorkoutStore((s) => s.status);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleStartNow = useCallback(async () => {
    if (!userId || !routineId) return;

    // Build WorkoutExercise[] from resolved exercises
    const exercises: WorkoutExercise[] = resolvedExercises.map((re) => {
      const increment = resolveIncrement(re.equipmentCategory);
      return {
        exerciseId: re.config.exerciseId,
        exerciseName: re.name,
        equipmentCategory: re.equipmentCategory,
        gymEquipmentInstanceId: null,
        targetSets: re.config.targetSets,
        targetReps: re.config.targetReps,
        restSeconds: re.config.restSeconds ?? 90,
        weightIncrement: increment.value,
        incrementUnit: increment.unit,
      };
    });

    await startWorkout({ userId, routineId, exercises });
    router.push('/(lifter)/(workout)/active');
  }, [userId, routineId, resolvedExercises, startWorkout, router]);

  const handleEditRoutine = useCallback(() => {
    // Navigate to routine builder (placeholder route for now)
    router.back();
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (!routine || isResolving) {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.accent} size="small" />
          <Text className="text-ambient text-body-sm mt-3">
            Loading routine...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-page">
      {/* Navigation header */}
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <Pressable
          onPress={handleBack}
          className="w-[44px] h-[44px] items-center justify-center -ml-2"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <IconChevronLeft size={22} color={Colors.primary} />
        </Pressable>
        <Text
          className="text-primary text-subtitle flex-1"
          accessibilityRole="header"
        >
          Pre-flight check
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* Hero: All set                                                     */}
        {/* ================================================================= */}
        <View className="bg-hero rounded-card-hero p-4 mb-4">
          {/* Status icon + label */}
          <View className="flex-row items-center gap-2 mb-2">
            <IconCircleCheckFilled size={22} color={Colors.positive} />
            <Text className="text-primary text-subtitle font-medium">
              All set
            </Text>
          </View>

          {/* Routine info */}
          <Text className="text-ambient text-body-sm mb-4">
            {routine.name} {'\u00B7'} {resolvedExercises.length} exercise{resolvedExercises.length !== 1 ? 's' : ''} ready
          </Text>

          {/* Stat tiles */}
          <View className="flex-row gap-2">
            <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1 items-center">
              <IconClock size={16} color={Colors.label} style={{ marginBottom: 2 }} />
              <Text className="text-primary text-subtitle font-medium">
                {estMinutes} min
              </Text>
              <Text className="text-label text-label-xs uppercase tracking-widest mt-0.5">
                est time
              </Text>
            </View>
            <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1 items-center">
              <IconBarbell size={16} color={Colors.label} style={{ marginBottom: 2 }} />
              <Text className="text-primary text-subtitle font-medium">
                {totalSets}
              </Text>
              <Text className="text-label text-label-xs uppercase tracking-widest mt-0.5">
                sets
              </Text>
            </View>
            <View className="bg-stat-tile rounded-btn-sm px-3 py-2 flex-1 items-center">
              <IconTarget size={16} color={Colors.label} style={{ marginBottom: 2 }} />
              <Text className="text-primary text-subtitle font-medium">
                ready
              </Text>
              <Text className="text-label text-label-xs uppercase tracking-widest mt-0.5">
                target
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================================= */}
        {/* Exercise checklist                                                */}
        {/* ================================================================= */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
          EXERCISE CHECKLIST
        </Text>

        {resolvedExercises.map((re, index) => (
          <View
            key={`${re.config.exerciseId}-${index}`}
            className="bg-card rounded-card p-card-pad mb-2 flex-row items-center border-[0.5px] border-border-subtle"
            accessibilityLabel={`${re.name}, ${re.equipmentName ?? 'bodyweight'}, ready`}
          >
            {/* Green check */}
            <IconCircleCheckFilled
              size={20}
              color={Colors.positive}
              style={{ marginRight: 12 }}
            />

            {/* Exercise info */}
            <View className="flex-1">
              <Text className="text-primary text-subtitle" numberOfLines={1}>
                {re.name}
              </Text>
              <Text className="text-label text-body-sm mt-0.5" numberOfLines={1}>
                {re.equipmentName ?? 'Bodyweight'} {'\u00B7'}{' '}
                {re.config.targetSets} {'\u00D7'} {re.config.targetReps}
              </Text>
            </View>
          </View>
        ))}

        {/* Empty state (routine has no exercises) */}
        {resolvedExercises.length === 0 && (
          <View className="bg-card rounded-card p-card-pad items-center mb-4">
            <Text className="text-ambient text-body-sm text-center">
              This routine has no exercises yet. Edit the routine to add exercises.
            </Text>
          </View>
        )}

        {/* Spacer before buttons */}
        <View className="h-4" />

        {/* ================================================================= */}
        {/* Action buttons                                                    */}
        {/* ================================================================= */}
        <Pressable
          onPress={handleStartNow}
          disabled={resolvedExercises.length === 0 || workoutStatus === 'active'}
          className={`rounded-btn min-h-btn items-center justify-center mb-3 ${
            resolvedExercises.length === 0 || workoutStatus === 'active'
              ? 'bg-stat-tile opacity-50'
              : 'bg-accent'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Start workout now"
        >
          <Text
            className={`text-[14px] font-medium ${
              resolvedExercises.length === 0 || workoutStatus === 'active'
                ? 'text-ambient'
                : 'text-accent-text'
            }`}
          >
            {workoutStatus === 'active' ? 'Workout already active' : 'Start now'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleEditRoutine}
          className="rounded-btn min-h-btn items-center justify-center border border-border-subtle mb-4"
          accessibilityRole="button"
          accessibilityLabel="Edit routine instead"
        >
          <Text className="text-label text-[14px]">
            Edit routine instead
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
