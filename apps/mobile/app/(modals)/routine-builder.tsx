/**
 * Screen 4 — Routine Builder
 *
 * Full-featured modal for creating and editing workout routines with real data
 * persistence to SQLite via PowerSync. Supports:
 *   - Inline editable name + description
 *   - Live summary stripe (exercises, sets, estimated time)
 *   - Inline exercise search and addition
 *   - Per-exercise config (sets, reps, rest) via stepper controls
 *   - Reorder via up/down arrows (v0; drag-to-reorder in v1)
 *   - Edit mode when routineId is passed as a search param
 *   - Unsaved-changes guard on close
 *
 * Data flow:
 *   Reads:  useExercises() for search, useRoutine(id) for edit mode
 *   Writes: usePowerSync().execute() for INSERT/UPDATE to `routines` table
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Crypto from 'expo-crypto';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { useUser } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import {
  IconX,
  IconSearch,
  IconPlus,
  IconMinus,
  IconChevronUp,
  IconChevronDown,
  IconTrash,
  IconGripVertical,
  IconClock,
} from '@tabler/icons-react-native';

import { Colors } from '@/constants/colors';
import type { RoutineExerciseConfig } from '@gym-app/domain';

// ============================================================================
// Types
// ============================================================================

interface ExerciseRow {
  id: string;
  name: string;
  body_part: string | null;
  target_muscle: string | null;
  equipment_id: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETS = 4;
const DEFAULT_REPS = 8;
const DEFAULT_REST_SECONDS = 90;

/** Average seconds per set (working time, not rest). Used for time estimation. */
const AVG_SECONDS_PER_SET = 45;

// ============================================================================
// Component
// ============================================================================

export default function RoutineBuilderScreen() {
  const router = useRouter();
  const db = usePowerSync();
  const { user } = useUser();
  const userId = user?.id ?? '';

  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const isEditMode = Boolean(routineId);

  // --------------------------------------------------------------------------
  // Routine form state
  // --------------------------------------------------------------------------

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!isEditMode);

  // Track whether user has made changes (for unsaved-changes guard)
  const hasChangesRef = useRef(false);
  const initialStateRef = useRef<{ name: string; description: string; exercises: string }>({
    name: '',
    description: '',
    exercises: '[]',
  });

  // --------------------------------------------------------------------------
  // Exercise search state
  // --------------------------------------------------------------------------

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // --------------------------------------------------------------------------
  // Expanding config state — which exercise index has expanded config
  // --------------------------------------------------------------------------

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // --------------------------------------------------------------------------
  // Load existing routine for edit mode
  // --------------------------------------------------------------------------

  const { data: routineData } = useQuery<{
    id: string;
    name: string;
    description: string | null;
    exercise_config: string;
  }>(
    routineId
      ? `SELECT id, name, description, exercise_config FROM routines WHERE id = ? LIMIT 1`
      : `SELECT 1 WHERE 0`,
    routineId ? [routineId] : [],
  );

  useEffect(() => {
    if (!isEditMode || isLoaded) return;
    const routine = routineData?.[0];
    if (!routine) return;

    const parsedName = routine.name ?? '';
    const parsedDescription = routine.description ?? '';
    let parsedExercises: RoutineExerciseConfig[] = [];
    try {
      parsedExercises = JSON.parse(routine.exercise_config ?? '[]');
    } catch {
      parsedExercises = [];
    }

    setName(parsedName);
    setDescription(parsedDescription);
    setExercises(parsedExercises);
    initialStateRef.current = {
      name: parsedName,
      description: parsedDescription,
      exercises: JSON.stringify(parsedExercises),
    };
    setIsLoaded(true);
  }, [isEditMode, isLoaded, routineData]);

  // --------------------------------------------------------------------------
  // Track changes for unsaved-changes guard
  // --------------------------------------------------------------------------

  useEffect(() => {
    const current = {
      name,
      description,
      exercises: JSON.stringify(exercises),
    };
    hasChangesRef.current =
      current.name !== initialStateRef.current.name ||
      current.description !== initialStateRef.current.description ||
      current.exercises !== initialStateRef.current.exercises;
  }, [name, description, exercises]);

  // --------------------------------------------------------------------------
  // Exercise search query
  // --------------------------------------------------------------------------

  const { data: searchResults } = useQuery<ExerciseRow>(
    debouncedSearch
      ? `SELECT id, name, body_part, target_muscle, equipment_id FROM exercises WHERE name LIKE ? ORDER BY name ASC LIMIT 30`
      : `SELECT id, name, body_part, target_muscle, equipment_id FROM exercises ORDER BY name ASC LIMIT 30`,
    debouncedSearch ? [`%${debouncedSearch}%`] : [],
  );

  // --------------------------------------------------------------------------
  // Equipment lookup for exercise subtitles
  // --------------------------------------------------------------------------

  const exerciseIdsInRoutine = useMemo(
    () => new Set(exercises.map((e) => e.exerciseId)),
    [exercises],
  );

  // Fetch exercise names for the routine's exercise IDs
  const exerciseIds = useMemo(
    () => exercises.map((e) => e.exerciseId),
    [exercises],
  );

  const { data: routineExerciseRows } = useQuery<ExerciseRow>(
    exerciseIds.length > 0
      ? `SELECT id, name, body_part, target_muscle, equipment_id FROM exercises WHERE id IN (${exerciseIds.map(() => '?').join(', ')})`
      : `SELECT 1 WHERE 0`,
    exerciseIds.length > 0 ? exerciseIds : [],
  );

  const exerciseMap = useMemo(() => {
    const map = new Map<string, ExerciseRow>();
    for (const row of routineExerciseRows ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [routineExerciseRows]);

  // --------------------------------------------------------------------------
  // Summary computations (live-updating)
  // --------------------------------------------------------------------------

  const totalSets = useMemo(
    () => exercises.reduce((sum, e) => sum + e.targetSets, 0),
    [exercises],
  );

  const estimatedMinutes = useMemo(() => {
    if (exercises.length === 0) return 0;
    const totalSeconds = exercises.reduce(
      (sum, e) => sum + e.targetSets * (e.restSeconds + AVG_SECONDS_PER_SET),
      0,
    );
    return Math.round(totalSeconds / 60);
  }, [exercises]);

  // --------------------------------------------------------------------------
  // Handlers: exercise management
  // --------------------------------------------------------------------------

  const handleAddExercise = useCallback(
    (exerciseRow: ExerciseRow) => {
      if (exerciseIdsInRoutine.has(exerciseRow.id)) return;

      const config: RoutineExerciseConfig = {
        exerciseId: exerciseRow.id,
        targetSets: DEFAULT_SETS,
        targetReps: DEFAULT_REPS,
        targetWeightValue: null,
        targetWeightUnit: null,
        restSeconds: DEFAULT_REST_SECONDS,
        supersetGroupId: null,
        notes: '',
      };

      setExercises((prev) => [...prev, config]);
      setShowExercisePicker(false);
      setSearchInput('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [exerciseIdsInRoutine],
  );

  const handleRemoveExercise = useCallback((index: number) => {
    Alert.alert(
      'Remove exercise',
      'Remove this exercise from the routine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setExercises((prev) => prev.filter((_, i) => i !== index));
            setExpandedIndex(null);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  }, []);

  const handleMoveExercise = useCallback(
    (fromIndex: number, direction: 'up' | 'down') => {
      setExercises((prev) => {
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= prev.length) return prev;

        const next = [...prev];
        const temp = next[fromIndex]!;
        next[fromIndex] = next[toIndex]!;
        next[toIndex] = temp;

        // Update expanded index to follow the moved item
        setExpandedIndex((prevExpanded) => {
          if (prevExpanded === fromIndex) return toIndex;
          if (prevExpanded === toIndex) return fromIndex;
          return prevExpanded;
        });

        return next;
      });
      void Haptics.selectionAsync();
    },
    [],
  );

  const handleUpdateConfig = useCallback(
    (index: number, updates: Partial<RoutineExerciseConfig>) => {
      setExercises((prev) =>
        prev.map((e, i) => (i === index ? { ...e, ...updates } : e)),
      );
    },
    [],
  );

  // --------------------------------------------------------------------------
  // Handlers: save
  // --------------------------------------------------------------------------

  const canSave = name.trim().length > 0 && exercises.length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || !userId || isSaving) return;

    setIsSaving(true);
    const now = new Date().toISOString();

    try {
      if (isEditMode && routineId) {
        await db.execute(
          `UPDATE routines SET name = ?, description = ?, exercise_config = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
          [name.trim(), description.trim() || null, JSON.stringify(exercises), now, routineId, userId],
        );
      } else {
        const newId = Crypto.randomUUID();
        await db.execute(
          `INSERT INTO routines (id, user_id, name, description, exercise_config, visibility, is_shareable, origin_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'private', 0, null, ?, ?)`,
          [newId, userId, name.trim(), description.trim() || null, JSON.stringify(exercises), now, now],
        );
      }

      hasChangesRef.current = false;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to save routine:', error);
      }
      Alert.alert('Error', 'Failed to save routine. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [canSave, userId, isSaving, isEditMode, routineId, db, name, description, exercises, router]);

  // --------------------------------------------------------------------------
  // Handlers: close with unsaved-changes guard
  // --------------------------------------------------------------------------

  const handleClose = useCallback(() => {
    if (hasChangesRef.current) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  }, [router]);

  // --------------------------------------------------------------------------
  // Loading state for edit mode
  // --------------------------------------------------------------------------

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center">
        <ActivityIndicator color={Colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header: X close | title | Save */}
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <Pressable
            onPress={handleClose}
            className="w-[44px] h-[44px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close routine builder"
          >
            <IconX size={22} color={Colors.primary} />
          </Pressable>

          <Text
            className="text-primary text-subtitle flex-1 text-center"
            accessibilityRole="header"
          >
            {isEditMode ? 'Edit routine' : 'New routine'}
          </Text>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || isSaving}
            className={`px-4 h-[38px] rounded-btn-sm items-center justify-center ${
              canSave && !isSaving ? 'bg-accent' : 'bg-stat-tile opacity-50'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Save routine"
            accessibilityState={{ disabled: !canSave || isSaving }}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.accentText} size="small" />
            ) : (
              <Text
                className={`text-[13px] font-medium ${
                  canSave ? 'text-accent-text' : 'text-ambient'
                }`}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Routine name */}
          <View className="px-4 mb-1">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Routine name"
              placeholderTextColor={Colors.label}
              maxLength={100}
              autoCapitalize="words"
              className="text-primary text-[18px] font-medium py-2"
              accessibilityLabel="Routine name"
            />
          </View>

          {/* Description */}
          <View className="px-4 mb-4">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add description..."
              placeholderTextColor={Colors.label}
              maxLength={500}
              multiline
              numberOfLines={2}
              className="text-ambient text-body-sm py-1"
              accessibilityLabel="Routine description"
            />
          </View>

          {/* Tag chips (stub for v0) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
          >
            <View className="px-2.5 py-1.5 rounded-pill bg-stat-tile">
              <Text className="text-ambient text-label-xs">Strength</Text>
            </View>
            <View className="px-2.5 py-1.5 rounded-pill bg-stat-tile">
              <Text className="text-ambient text-label-xs">Upper body</Text>
            </View>
            <Pressable
              className="px-2.5 py-1.5 rounded-pill border border-dashed border-border-subtle"
              accessibilityRole="button"
              accessibilityLabel="Add tag"
            >
              <Text className="text-label text-label-xs">+ tag</Text>
            </Pressable>
          </ScrollView>

          {/* Summary stripe — 3 tiles */}
          <View className="flex-row px-4 gap-2 mb-5">
            <View className="flex-1 bg-stat-tile rounded-btn-sm p-2.5">
              <Text className="text-ambient text-label-xs uppercase tracking-widest">
                Exercises
              </Text>
              <Text className="text-primary text-subtitle font-medium mt-0.5">
                {exercises.length}
              </Text>
            </View>
            <View className="flex-1 bg-stat-tile rounded-btn-sm p-2.5">
              <Text className="text-ambient text-label-xs uppercase tracking-widest">
                Total sets
              </Text>
              <Text className="text-primary text-subtitle font-medium mt-0.5">
                {totalSets}
              </Text>
            </View>
            <View className="flex-1 bg-stat-tile rounded-btn-sm p-2.5 flex-row items-center">
              <View className="flex-1">
                <Text className="text-ambient text-label-xs uppercase tracking-widest">
                  Est. time
                </Text>
                <Text className="text-primary text-subtitle font-medium mt-0.5">
                  {estimatedMinutes > 0 ? `${estimatedMinutes} min` : '\u2014'}
                </Text>
              </View>
              <IconClock size={14} color={Colors.ambient} />
            </View>
          </View>

          {/* EXERCISES section label */}
          <View className="flex-row items-center justify-between px-4 mb-2">
            <Text className="text-label text-label-xs uppercase tracking-widest">
              Exercises
            </Text>
          </View>

          {/* Exercise list */}
          {exercises.map((config, index) => {
            const exerciseInfo = exerciseMap.get(config.exerciseId);
            const isExpanded = expandedIndex === index;

            return (
              <ExerciseRowItem
                key={`${config.exerciseId}-${index}`}
                config={config}
                index={index}
                exerciseInfo={exerciseInfo}
                isExpanded={isExpanded}
                isFirst={index === 0}
                isLast={index === exercises.length - 1}
                onToggleExpand={() =>
                  setExpandedIndex(isExpanded ? null : index)
                }
                onUpdate={(updates) => handleUpdateConfig(index, updates)}
                onMoveUp={() => handleMoveExercise(index, 'up')}
                onMoveDown={() => handleMoveExercise(index, 'down')}
                onRemove={() => handleRemoveExercise(index)}
              />
            );
          })}

          {/* Empty state */}
          {exercises.length === 0 && !showExercisePicker && (
            <View className="mx-4 items-center py-6">
              <Text className="text-ambient text-body-sm text-center">
                No exercises added yet. Tap the button below to build your
                routine.
              </Text>
            </View>
          )}

          {/* Inline exercise picker */}
          {showExercisePicker && (
            <View className="mx-4 mb-3">
              {/* Search input */}
              <View className="flex-row items-center bg-card rounded-card border-[0.5px] border-border-active px-3 h-11 mb-2">
                <IconSearch size={16} color={Colors.label} />
                <TextInput
                  ref={searchInputRef}
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Search exercises..."
                  placeholderTextColor={Colors.label}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={Keyboard.dismiss}
                  className="flex-1 ml-2 text-primary text-body-sm"
                  accessibilityLabel="Search exercises to add"
                />
                <Pressable
                  onPress={() => {
                    setShowExercisePicker(false);
                    setSearchInput('');
                  }}
                  className="w-[28px] h-[28px] items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Close exercise search"
                >
                  <IconX size={14} color={Colors.label} />
                </Pressable>
              </View>

              {/* Search results */}
              <View className="bg-card rounded-card border-[0.5px] border-border-subtle overflow-hidden max-h-[280px]">
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {(searchResults ?? []).map((row) => {
                    const alreadyAdded = exerciseIdsInRoutine.has(row.id);
                    return (
                      <Pressable
                        key={row.id}
                        onPress={() => {
                          if (!alreadyAdded) handleAddExercise(row);
                        }}
                        disabled={alreadyAdded}
                        className={`flex-row items-center px-3 py-3 border-b-[0.5px] border-border-subtle ${
                          alreadyAdded ? 'opacity-40' : ''
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel={`${alreadyAdded ? 'Already added: ' : 'Add '}${row.name}`}
                      >
                        <View className="w-8 h-8 rounded-btn-sm bg-stat-tile items-center justify-center mr-3">
                          <Text className="text-label text-[10px]">
                            {(row.body_part ?? '?')[0]?.toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-primary text-[13px] font-medium" numberOfLines={1}>
                            {row.name}
                          </Text>
                          <Text className="text-label text-[11px] mt-0.5" numberOfLines={1}>
                            {row.target_muscle ?? row.body_part ?? 'Unknown'}
                          </Text>
                        </View>
                        {alreadyAdded ? (
                          <Text className="text-ambient text-body-sm">{'\u2713'}</Text>
                        ) : (
                          <IconPlus size={16} color={Colors.accent} />
                        )}
                      </Pressable>
                    );
                  })}
                  {(searchResults ?? []).length === 0 && debouncedSearch && (
                    <View className="py-6 items-center">
                      <Text className="text-ambient text-body-sm">
                        No exercises found
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {/* + Add exercise button */}
          {!showExercisePicker && (
            <Pressable
              onPress={() => setShowExercisePicker(true)}
              className="mx-4 mt-2 mb-6 h-[48px] rounded-card border border-dashed border-border-subtle items-center justify-center flex-row gap-2"
              accessibilityRole="button"
              accessibilityLabel="Add exercise to routine"
            >
              <IconPlus size={16} color={Colors.label} />
              <Text className="text-label text-[13px] font-medium">
                Add exercise
              </Text>
            </Pressable>
          )}

          {/* Bottom padding */}
          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// ExerciseRowItem — a single exercise in the routine builder list
// ============================================================================

interface ExerciseRowItemProps {
  config: RoutineExerciseConfig;
  index: number;
  exerciseInfo: ExerciseRow | undefined;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<RoutineExerciseConfig>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function ExerciseRowItem({
  config,
  index,
  exerciseInfo,
  isExpanded,
  isFirst,
  isLast,
  onToggleExpand,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: ExerciseRowItemProps) {
  const exerciseName = exerciseInfo?.name ?? 'Unknown exercise';
  const subtitle = [
    exerciseInfo?.target_muscle,
    exerciseInfo?.body_part,
  ]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <View className="mx-4 mb-2">
      <Pressable
        onPress={onToggleExpand}
        className="bg-card rounded-card p-card-pad border-[0.5px] border-border-subtle"
        accessibilityRole="button"
        accessibilityLabel={`${exerciseName}, ${config.targetSets} sets, ${config.targetReps} reps. Tap to ${isExpanded ? 'collapse' : 'expand'} settings.`}
      >
        {/* Top row: badge + name + drag handle */}
        <View className="flex-row items-center">
          {/* Numbered badge */}
          <View className="w-[26px] h-[26px] rounded-[8px] bg-hero items-center justify-center mr-3">
            <Text className="text-primary text-[11px] font-medium">
              {index + 1}
            </Text>
          </View>

          {/* Name + subtitle */}
          <View className="flex-1 mr-2">
            <Text
              className="text-primary text-[13px] font-medium"
              numberOfLines={1}
            >
              {exerciseName}
            </Text>
            {subtitle ? (
              <Text className="text-label text-[11px] mt-0.5" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {/* Drag handle icon (visual indicator for v0) */}
          <IconGripVertical size={18} color={Colors.borderSubtle} />
        </View>

        {/* Chip cluster */}
        <View className="flex-row gap-1.5 mt-2.5">
          <View className="px-2 py-1 rounded-pill bg-stat-tile">
            <Text className="text-ambient text-[10px]">
              {config.targetSets} sets
            </Text>
          </View>
          <View className="px-2 py-1 rounded-pill bg-stat-tile">
            <Text className="text-ambient text-[10px]">
              {config.targetReps} reps
            </Text>
          </View>
          <View className="px-2 py-1 rounded-pill bg-stat-tile">
            <Text className="text-ambient text-[10px]">
              {formatRest(config.restSeconds)}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Expanded config panel */}
      {isExpanded && (
        <View className="bg-card rounded-b-card border-x-[0.5px] border-b-[0.5px] border-border-subtle px-card-pad pb-card-pad -mt-[1px]">
          {/* Separator */}
          <View className="h-[0.5px] bg-border-subtle mb-3" />

          {/* Stepper row: Sets / Reps / Rest */}
          <View className="flex-row justify-between mb-3">
            <MiniStepper
              label="Sets"
              value={config.targetSets}
              min={1}
              max={20}
              onIncrement={() => onUpdate({ targetSets: config.targetSets + 1 })}
              onDecrement={() => onUpdate({ targetSets: Math.max(1, config.targetSets - 1) })}
            />
            <MiniStepper
              label="Reps"
              value={config.targetReps}
              min={1}
              max={100}
              onIncrement={() => onUpdate({ targetReps: config.targetReps + 1 })}
              onDecrement={() => onUpdate({ targetReps: Math.max(1, config.targetReps - 1) })}
            />
            <MiniStepper
              label="Rest (s)"
              value={config.restSeconds}
              min={0}
              max={600}
              step={15}
              onIncrement={() => onUpdate({ restSeconds: Math.min(600, config.restSeconds + 15) })}
              onDecrement={() => onUpdate({ restSeconds: Math.max(0, config.restSeconds - 15) })}
            />
          </View>

          {/* Notes input */}
          <TextInput
            value={config.notes}
            onChangeText={(text) => onUpdate({ notes: text })}
            placeholder="Notes for this exercise..."
            placeholderTextColor={Colors.label}
            multiline
            numberOfLines={1}
            maxLength={200}
            className="text-ambient text-body-sm bg-stat-tile rounded-btn-sm px-3 py-2 mb-3"
            accessibilityLabel={`Notes for ${exerciseName}`}
          />

          {/* Action buttons: reorder + delete */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-1">
              <Pressable
                onPress={onMoveUp}
                disabled={isFirst}
                className={`w-[36px] h-[36px] rounded-btn-sm items-center justify-center ${
                  isFirst ? 'opacity-30' : 'bg-stat-tile'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Move exercise up"
                accessibilityState={{ disabled: isFirst }}
              >
                <IconChevronUp size={18} color={Colors.ambient} />
              </Pressable>
              <Pressable
                onPress={onMoveDown}
                disabled={isLast}
                className={`w-[36px] h-[36px] rounded-btn-sm items-center justify-center ${
                  isLast ? 'opacity-30' : 'bg-stat-tile'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Move exercise down"
                accessibilityState={{ disabled: isLast }}
              >
                <IconChevronDown size={18} color={Colors.ambient} />
              </Pressable>
            </View>

            <Pressable
              onPress={onRemove}
              className="w-[36px] h-[36px] rounded-btn-sm bg-stat-tile items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Remove ${exerciseName}`}
            >
              <IconTrash size={16} color={Colors.coral} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MiniStepper — compact +/- control for sets, reps, rest
// ============================================================================

interface MiniStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

function MiniStepper({
  label,
  value,
  min,
  max,
  step = 1,
  onIncrement,
  onDecrement,
}: MiniStepperProps) {
  const handleIncrement = useCallback(() => {
    if (value < max) {
      onIncrement();
      void Haptics.selectionAsync();
    }
  }, [value, max, onIncrement]);

  const handleDecrement = useCallback(() => {
    if (value > min) {
      onDecrement();
      void Haptics.selectionAsync();
    }
  }, [value, min, onDecrement]);

  return (
    <View className="items-center">
      <Text className="text-label text-[10px] uppercase tracking-widest mb-1.5">
        {label}
      </Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={handleDecrement}
          disabled={value <= min}
          className={`w-[30px] h-[30px] rounded-btn-sm items-center justify-center ${
            value <= min ? 'opacity-30' : 'bg-hero'
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label} by ${step}`}
        >
          <IconMinus size={14} color={Colors.primary} />
        </Pressable>

        <Text className="text-primary text-[16px] font-medium min-w-[36px] text-center">
          {value}
        </Text>

        <Pressable
          onPress={handleIncrement}
          disabled={value >= max}
          className={`w-[30px] h-[30px] rounded-btn-sm items-center justify-center ${
            value >= max ? 'opacity-30' : 'bg-hero'
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label} by ${step}`}
        >
          <IconPlus size={14} color={Colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatRest(seconds: number): string {
  if (seconds === 0) return 'No rest';
  if (seconds < 60) return `${seconds}s rest`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} min rest`;
  return `${mins}m ${secs}s rest`;
}
