/**
 * Screen 9 — Smart Exercise Selector
 *
 * Search and filter exercises to add to an in-progress workout.
 * Shows "Recent" exercises by default (most recently used), with muscle group
 * filter chips and a debounced search bar. Each row displays the last weight
 * annotation so the user knows at a glance what they lifted last time.
 *
 * On "+" tap, the exercise is pushed to the workout store via addExercise()
 * and the screen navigates back to the set logger.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from '@powersync/react-native';
import {
  IconSearch,
  IconPlus,
  IconX,
  IconClock,
} from '@tabler/icons-react-native';

import { useWorkoutStore } from '@/stores';
import type { WorkoutExercise } from '@/stores';
import { resolveIncrement } from '@/lib/workout';
import { Colors } from '@/constants/colors';
import { BODY_PART_MAP } from '@/constants/body-parts';
import { MUSCLE_GROUPS, type MuscleGroup } from '@gym-app/domain';

// ============================================================================
// Types
// ============================================================================

interface ExerciseRow {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  equipment_id: string | null;
  is_custom: number;
}

interface LastSetRow {
  exercise_id: string;
  weight_value: number | null;
  weight_unit: string | null;
  reps: number | null;
  performed_at: string;
}

interface RecentExerciseRow {
  exercise_id: string;
  last_used: string;
}

// ============================================================================
// Filter chip definitions
// ============================================================================

const FILTER_CHIPS = ['Recent', ...MUSCLE_GROUPS] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

// ============================================================================
// Component
// ============================================================================

export default function ExerciseSelectorScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id ?? '';

  const addExercise = useWorkoutStore((s) => s.addExercise);
  const exercises = useWorkoutStore((s) => s.exercises);

  // --------------------------------------------------------------------------
  // Search with debounce
  // --------------------------------------------------------------------------

  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // --------------------------------------------------------------------------
  // Filter chips
  // --------------------------------------------------------------------------

  const [activeFilter, setActiveFilter] = useState<FilterChip>('Recent');

  // --------------------------------------------------------------------------
  // Recent exercises query: last 20 distinct exercises used by this user
  // --------------------------------------------------------------------------

  const { data: recentRows } = useQuery<RecentExerciseRow>(
    userId
      ? `SELECT DISTINCT exercise_id, MAX(performed_at) AS last_used
         FROM workout_sets
         WHERE user_id = ?
         GROUP BY exercise_id
         ORDER BY last_used DESC
         LIMIT 20`
      : `SELECT 1 WHERE 0`,
    userId ? [userId] : [],
  );

  const recentExerciseIds = useMemo(
    () => (recentRows ?? []).map((r) => r.exercise_id),
    [recentRows],
  );

  // --------------------------------------------------------------------------
  // Last set per exercise (for annotation). Batch-load for all exercises
  // in one query using a window function approach.
  // --------------------------------------------------------------------------

  const { data: lastSetRows } = useQuery<LastSetRow>(
    userId
      ? `SELECT ws.exercise_id, ws.weight_value, ws.weight_unit, ws.reps, ws.performed_at
         FROM workout_sets ws
         INNER JOIN (
           SELECT exercise_id, MAX(performed_at) AS max_performed
           FROM workout_sets
           WHERE user_id = ? AND is_warmup = 0
           GROUP BY exercise_id
         ) latest ON ws.exercise_id = latest.exercise_id AND ws.performed_at = latest.max_performed
         WHERE ws.user_id = ?`
      : `SELECT 1 WHERE 0`,
    userId ? [userId, userId] : [],
  );

  const lastSetMap = useMemo(() => {
    const map = new Map<string, LastSetRow>();
    for (const row of lastSetRows ?? []) {
      map.set(row.exercise_id, row);
    }
    return map;
  }, [lastSetRows]);

  // --------------------------------------------------------------------------
  // Exercise query: depends on active filter + search
  // --------------------------------------------------------------------------

  const exerciseQuery = useMemo(() => {
    // "Recent" filter: get exercises matching the recent IDs
    if (activeFilter === 'Recent' && !debouncedSearch && recentExerciseIds.length > 0) {
      const placeholders = recentExerciseIds.map(() => '?').join(', ');
      return {
        sql: `SELECT * FROM exercises WHERE id IN (${placeholders})`,
        params: recentExerciseIds,
      };
    }

    // Build filtered query
    let sql = 'SELECT * FROM exercises WHERE 1=1';
    const params: string[] = [];

    if (debouncedSearch) {
      sql += ' AND name LIKE ?';
      params.push(`%${debouncedSearch}%`);
    }

    if (activeFilter !== 'Recent') {
      const bodyParts = BODY_PART_MAP[activeFilter] ?? [];
      if (bodyParts.length > 0) {
        const placeholders = bodyParts.map(() => '?').join(', ');
        sql += ` AND body_part IN (${placeholders})`;
        params.push(...bodyParts);
      }
    }

    sql += ' ORDER BY name ASC';
    return { sql, params };
  }, [activeFilter, debouncedSearch, recentExerciseIds]);

  const { data: exerciseData } = useQuery<ExerciseRow>(
    exerciseQuery.sql,
    exerciseQuery.params,
  );

  // Sort recent exercises by last-used order
  const exerciseList = useMemo(() => {
    const raw = exerciseData ?? [];
    if (activeFilter === 'Recent' && !debouncedSearch && recentExerciseIds.length > 0) {
      // Maintain the order from the recent query
      const idToExercise = new Map(raw.map((e) => [e.id, e]));
      return recentExerciseIds
        .map((id) => idToExercise.get(id))
        .filter((e): e is ExerciseRow => e !== undefined);
    }
    return raw;
  }, [exerciseData, activeFilter, debouncedSearch, recentExerciseIds]);

  // --------------------------------------------------------------------------
  // IDs already in the workout (to show a check instead of +)
  // --------------------------------------------------------------------------

  const exerciseIdsInWorkout = useMemo(
    () => new Set(exercises.map((e) => e.exerciseId)),
    [exercises],
  );

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleAddExercise = useCallback(
    (row: ExerciseRow) => {
      const increment = resolveIncrement(null); // Will use category lookup if available

      const exercise: WorkoutExercise = {
        exerciseId: row.id,
        exerciseName: row.name,
        equipmentCategory: null,
        gymEquipmentInstanceId: null,
        targetSets: 3, // Reasonable default
        targetReps: 8, // Reasonable default
        restSeconds: 90,
        weightIncrement: increment.value,
        incrementUnit: increment.unit,
      };

      addExercise(exercise);
      router.back();
    },
    [addExercise, router],
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleClearSearch = useCallback(() => {
    setInputValue('');
  }, []);

  // --------------------------------------------------------------------------
  // FlashList renderItem
  // --------------------------------------------------------------------------

  const renderExerciseRow = useCallback(
    ({ item, index }: ListRenderItemInfo<ExerciseRow>) => {
      const lastSet = lastSetMap.get(item.id);
      const isInWorkout = exerciseIdsInWorkout.has(item.id);
      const isFirstRow = index === 0;

      return (
        <View className="px-4">
          <View className="bg-card rounded-card p-card-pad mb-2 border-[0.5px] border-border-subtle flex-row items-center">
            {/* Icon tile */}
            <View className="w-10 h-10 rounded-btn-sm bg-stat-tile items-center justify-center mr-3">
              <Text className="text-label text-label-xs">
                {(item.body_part ?? '?')[0]?.toUpperCase()}
              </Text>
            </View>

            {/* Name + subtitle */}
            <View className="flex-1 mr-3">
              <Text className="text-primary text-subtitle" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-label text-body-sm mt-0.5" numberOfLines={1}>
                {lastSet ? (
                  <LastSetAnnotation lastSet={lastSet} />
                ) : (
                  item.target_muscle ?? item.body_part ?? 'Unknown'
                )}
              </Text>
            </View>

            {/* Add button */}
            {isInWorkout ? (
              <View
                className="w-[44px] h-[44px] rounded-btn-sm bg-stat-tile items-center justify-center opacity-50"
                accessibilityLabel={`${item.name} already added`}
              >
                <Text className="text-ambient text-body-sm">{'\u2713'}</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => handleAddExercise(item)}
                className={`w-[44px] h-[44px] rounded-btn-sm items-center justify-center ${
                  isFirstRow ? 'bg-accent' : 'bg-stat-tile'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to workout`}
              >
                <IconPlus
                  size={18}
                  color={isFirstRow ? Colors.accentText : Colors.ambient}
                />
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [lastSetMap, exerciseIdsInWorkout, handleAddExercise],
  );

  // --------------------------------------------------------------------------
  // FlashList header
  // --------------------------------------------------------------------------

  const ListHeader = useMemo(
    () => (
      <View>
        {/* Screen header */}
        <View className="flex-row items-center justify-between px-4 pt-3 mb-3">
          <Pressable
            onPress={handleClose}
            className="w-[44px] h-[44px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close exercise selector"
          >
            <IconX size={22} color={Colors.primary} />
          </Pressable>

          <Text
            className="text-primary text-subtitle flex-1 text-center"
            accessibilityRole="header"
          >
            Add exercise
          </Text>

          {/* Spacer to balance the X button */}
          <View className="w-[44px]" />
        </View>

        {/* Search bar */}
        <View className="mx-4 mb-3">
          <View className="flex-row items-center bg-card rounded-card border-[0.5px] border-border-subtle px-3 h-11">
            <IconSearch size={16} color={Colors.label} />
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Search exercises..."
              placeholderTextColor={Colors.label}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
              className="flex-1 ml-2 text-primary text-body-sm"
              accessibilityLabel="Search exercises"
            />
            {inputValue.length > 0 && (
              <Pressable
                onPress={handleClearSearch}
                className="w-[28px] h-[28px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <IconX size={14} color={Colors.label} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
        >
          {FILTER_CHIPS.map((chip) => {
            const isActive = chip === activeFilter;
            const isRecent = chip === 'Recent';
            return (
              <Pressable
                key={chip}
                onPress={() => setActiveFilter(chip)}
                className={`flex-row items-center px-3 py-2.5 rounded-pill min-h-tap justify-center ${
                  isActive
                    ? 'bg-accent'
                    : 'bg-card border-[0.5px] border-border-subtle'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter by ${chip}`}
              >
                {isRecent && (
                  <IconClock
                    size={14}
                    color={isActive ? Colors.accentText : Colors.ambient}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  className={`text-body-sm capitalize ${
                    isActive ? 'text-accent-text font-medium' : 'text-ambient'
                  }`}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section label */}
        <View className="px-4 mb-1">
          <Text className="text-label text-label-xs uppercase tracking-widest">
            {debouncedSearch
              ? `Results \u00B7 ${exerciseList.length}`
              : activeFilter === 'Recent'
                ? `Recently used \u00B7 ${exerciseList.length}`
                : `${activeFilter} \u00B7 ${exerciseList.length}`}
          </Text>
        </View>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      inputValue,
      activeFilter,
      debouncedSearch,
      exerciseList.length,
      handleClose,
      handleClearSearch,
    ],
  );

  // --------------------------------------------------------------------------
  // FlashList empty
  // --------------------------------------------------------------------------

  const ListEmpty = useMemo(
    () => (
      <View className="items-center py-8 px-4">
        <Text className="text-ambient text-body-sm text-center">
          {debouncedSearch
            ? `No exercises found for "${debouncedSearch}"`
            : activeFilter === 'Recent'
              ? 'No recent exercises yet. Start a workout to build your history.'
              : 'No exercises in this category'}
        </Text>
      </View>
    ),
    [debouncedSearch, activeFilter],
  );

  // --------------------------------------------------------------------------
  // FlashList footer (bottom padding)
  // --------------------------------------------------------------------------

  const ListFooter = useMemo(() => <View className="h-8" />, []);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-page">
      <FlashList<ExerciseRow>
        data={exerciseList}
        renderItem={renderExerciseRow}
        keyExtractor={keyExtractor}
        estimatedItemSize={72}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

// ============================================================================
// Last set annotation (inline text component)
// ============================================================================

function LastSetAnnotation({ lastSet }: { lastSet: LastSetRow }) {
  const weight = lastSet.weight_value;
  const unit = lastSet.weight_unit ?? 'kg';
  const reps = lastSet.reps;
  const daysAgo = getDaysAgo(lastSet.performed_at);

  const parts: string[] = [];
  if (weight !== null && reps !== null) {
    parts.push(`Last: ${weight} ${unit} \u00D7 ${reps}`);
  } else if (weight !== null) {
    parts.push(`Last: ${weight} ${unit}`);
  }

  if (daysAgo !== null) {
    if (daysAgo === 0) {
      parts.push('today');
    } else if (daysAgo === 1) {
      parts.push('yesterday');
    } else {
      parts.push(`${daysAgo}d ago`);
    }
  }

  return <>{parts.join(' \u00B7 ')}</>;
}

// ============================================================================
// Helpers
// ============================================================================

function keyExtractor(item: ExerciseRow): string {
  return item.id;
}

function getDaysAgo(isoString: string): number | null {
  try {
    const then = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
