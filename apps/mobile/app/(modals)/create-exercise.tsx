/**
 * Screen — Create Custom Exercise (modal)
 *
 * Lets users add exercises not in the catalog. Writes directly to local SQLite
 * via PowerSync (local-first), so the exercise is instantly available even
 * offline. Syncs to Supabase Postgres on the next connection.
 *
 * Validation: name is required (min 1 char after trim). All other fields are
 * optional but encouraged via the UI flow.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { usePowerSync, useQuery } from '@powersync/react-native';
import { IconX, IconPlus } from '@tabler/icons-react-native';

import { Colors } from '@/constants/colors';

// =============================================================================
// Constants
// =============================================================================

/** Body parts from the seed data — single-select chip grid. */
const BODY_PARTS = [
  'chest',
  'back',
  'upper legs',
  'lower legs',
  'shoulders',
  'upper arms',
  'lower arms',
  'core',
  'full body',
] as const;

type BodyPart = (typeof BODY_PARTS)[number];

// =============================================================================
// Equipment query hook
// =============================================================================

interface EquipmentRow {
  id: string;
  name: string;
  category: string | null;
  sort_order: number;
}

function useEquipmentList() {
  return useQuery<EquipmentRow>(
    'SELECT * FROM equipment ORDER BY sort_order ASC',
  );
}

// =============================================================================
// Component
// =============================================================================

export default function CreateExerciseScreen() {
  const router = useRouter();
  const { user } = useUser();
  const db = usePowerSync();
  const userId = user?.id ?? '';

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [name, setName] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPart | null>(null);
  const [targetMuscle, setTargetMuscle] = useState('');
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [secondaryInput, setSecondaryInput] = useState('');
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // Equipment data
  // ---------------------------------------------------------------------------
  const { data: equipmentData } = useEquipmentList();
  const equipmentList: EquipmentRow[] = equipmentData ?? [];

  // ---------------------------------------------------------------------------
  // Derived: is form valid?
  // ---------------------------------------------------------------------------
  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleSelectBodyPart = useCallback((part: BodyPart) => {
    setBodyPart((prev) => (prev === part ? null : part));
  }, []);

  const handleSelectEquipment = useCallback((id: string) => {
    setEquipmentId((prev) => (prev === id ? null : id));
  }, []);

  const handleAddSecondaryMuscle = useCallback(() => {
    const value = secondaryInput.trim().toLowerCase();
    if (!value) return;
    setSecondaryMuscles((prev) => {
      if (prev.includes(value)) return prev;
      return [...prev, value];
    });
    setSecondaryInput('');
  }, [secondaryInput]);

  const handleRemoveSecondaryMuscle = useCallback((muscle: string) => {
    setSecondaryMuscles((prev) => prev.filter((m) => m !== muscle));
  }, []);

  const handleSave = useCallback(async () => {
    // Validate name
    if (!trimmedName) {
      setNameError(true);
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'You must be signed in to create an exercise.');
      return;
    }

    setIsSaving(true);

    try {
      const exerciseId = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO exercises (id, name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          exerciseId,
          trimmedName,
          notes.trim() || null,
          bodyPart,
          targetMuscle.trim() || null,
          JSON.stringify(secondaryMuscles),
          equipmentId,
          userId,
          now,
          now,
        ],
      );

      router.back();
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to save custom exercise:', error);
      }
      Alert.alert(
        'Save Failed',
        'Could not save the exercise. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    trimmedName,
    notes,
    bodyPart,
    targetMuscle,
    secondaryMuscles,
    equipmentId,
    userId,
    db,
    router,
  ]);

  // Clear name error when user types
  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setNameError(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const bodyPartChips = useMemo(
    () =>
      BODY_PARTS.map((part) => {
        const isActive = bodyPart === part;
        return (
          <Pressable
            key={part}
            onPress={() => handleSelectBodyPart(part)}
            className={`px-3 py-2.5 rounded-pill mr-2 mb-2 ${
              isActive
                ? 'bg-accent'
                : 'bg-card border-[0.5px] border-border-subtle'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Body part: ${part}`}
          >
            <Text
              className={`text-body-sm capitalize ${
                isActive ? 'text-accent-text font-medium' : 'text-ambient'
              }`}
            >
              {part}
            </Text>
          </Pressable>
        );
      }),
    [bodyPart, handleSelectBodyPart],
  );

  const equipmentChips = useMemo(
    () =>
      equipmentList.map((eq) => {
        const isActive = equipmentId === eq.id;
        return (
          <Pressable
            key={eq.id}
            onPress={() => handleSelectEquipment(eq.id)}
            className={`px-3 py-2.5 rounded-pill mr-2 mb-2 ${
              isActive
                ? 'bg-accent'
                : 'bg-card border-[0.5px] border-border-subtle'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Equipment: ${eq.name}`}
          >
            <Text
              className={`text-body-sm capitalize ${
                isActive ? 'text-accent-text font-medium' : 'text-ambient'
              }`}
            >
              {eq.name}
            </Text>
          </Pressable>
        );
      }),
    [equipmentList, equipmentId, handleSelectEquipment],
  );

  const secondaryMuscleChips = useMemo(
    () =>
      secondaryMuscles.map((muscle) => (
        <Pressable
          key={muscle}
          onPress={() => handleRemoveSecondaryMuscle(muscle)}
          className="flex-row items-center bg-stat-tile rounded-pill px-3 py-1.5 mr-2 mb-2"
          accessibilityRole="button"
          accessibilityLabel={`Remove ${muscle}`}
        >
          <Text className="text-ambient text-body-sm capitalize mr-1">
            {muscle}
          </Text>
          <IconX size={12} color={Colors.ambient} />
        </Pressable>
      )),
    [secondaryMuscles, handleRemoveSecondaryMuscle],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1">
            {/* ----------------------------------------------------------------
              Header bar
            ---------------------------------------------------------------- */}
            <View className="flex-row items-center justify-between px-4 py-2">
              <Pressable
                onPress={handleClose}
                className="w-[44px] h-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <IconX size={20} color={Colors.label} />
              </Pressable>

              <Text className="text-primary text-subtitle font-medium">
                Create Exercise
              </Text>

              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                className="h-[44px] px-3 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Save exercise"
              >
                <Text
                  className={`text-body-sm font-medium ${
                    isValid && !isSaving ? 'text-accent' : 'text-ambient'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>

            {/* ----------------------------------------------------------------
              Form body
            ---------------------------------------------------------------- */}
            <ScrollView
              className="flex-1 px-4"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Exercise name */}
              <View className="mb-5">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
                  EXERCISE NAME
                </Text>
                <TextInput
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder="e.g. Seated Cable Row"
                  placeholderTextColor={Colors.label}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  maxLength={100}
                  className={`bg-card rounded-card px-3 h-11 text-primary text-body-sm border-[0.5px] ${
                    nameError ? 'border-coral' : 'border-border-subtle'
                  }`}
                  accessibilityLabel="Exercise name"
                />
                {nameError && (
                  <Text className="text-coral text-body-sm mt-1">
                    Exercise name is required
                  </Text>
                )}
              </View>

              {/* Body part selection */}
              <View className="mb-5">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
                  BODY PART
                </Text>
                <View className="flex-row flex-wrap">{bodyPartChips}</View>
              </View>

              {/* Target muscle */}
              <View className="mb-5">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
                  TARGET MUSCLE
                </Text>
                <TextInput
                  value={targetMuscle}
                  onChangeText={setTargetMuscle}
                  placeholder="e.g. lats, pectorals, glutes"
                  placeholderTextColor={Colors.label}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  maxLength={60}
                  className="bg-card rounded-card px-3 h-11 text-primary text-body-sm border-[0.5px] border-border-subtle"
                  accessibilityLabel="Target muscle"
                />
              </View>

              {/* Secondary muscles */}
              <View className="mb-5">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
                  SECONDARY MUSCLES
                </Text>

                {secondaryMuscles.length > 0 && (
                  <View className="flex-row flex-wrap mb-2">
                    {secondaryMuscleChips}
                  </View>
                )}

                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={secondaryInput}
                    onChangeText={setSecondaryInput}
                    placeholder="Add a muscle..."
                    placeholderTextColor={Colors.label}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    maxLength={40}
                    onSubmitEditing={handleAddSecondaryMuscle}
                    className="flex-1 bg-card rounded-card px-3 h-11 text-primary text-body-sm border-[0.5px] border-border-subtle"
                    accessibilityLabel="Secondary muscle name"
                  />
                  <Pressable
                    onPress={handleAddSecondaryMuscle}
                    className="w-11 h-11 rounded-card bg-stat-tile items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Add secondary muscle"
                  >
                    <IconPlus size={18} color={Colors.label} />
                  </Pressable>
                </View>
              </View>

              {/* Equipment selection */}
              <View className="mb-5">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
                  EQUIPMENT
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 8 }}
                >
                  <View className="flex-row flex-wrap">
                    {equipmentChips}
                  </View>
                </ScrollView>
              </View>

              {/* Notes / instructions */}
              <View className="mb-6">
                <Text className="text-label text-label-xs uppercase tracking-widest mb-2">
                  NOTES
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Form cues, setup instructions..."
                  placeholderTextColor={Colors.label}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  maxLength={500}
                  className="bg-card rounded-card px-3 py-3 text-primary text-body-sm border-[0.5px] border-border-subtle min-h-[100px]"
                  accessibilityLabel="Notes"
                />
              </View>

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                className={`items-center rounded-btn py-3.5 mb-8 ${
                  isValid && !isSaving ? 'bg-accent' : 'bg-stat-tile'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Save exercise"
              >
                <Text
                  className={`text-subtitle font-medium ${
                    isValid && !isSaving ? 'text-accent-text' : 'text-ambient'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Exercise'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
