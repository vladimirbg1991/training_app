import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconChevronLeft,
  IconPlayerPlay,
  IconPlus,
  IconInfoCircle,
  IconAlertCircle,
} from '@tabler/icons-react-native';
import { z } from 'zod';
import { useCallback } from 'react';
import { Colors } from '@/constants/colors';
import { useExercise } from '@/lib/powersync';
import { useWorkoutStore } from '@/stores/workout-store';

const secondaryMusclesParser = z.array(z.string()).catch([]);

export default function ExerciseDetailScreen(): React.JSX.Element {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();
  const { data, isLoading } = useExercise(exerciseId);
  const workoutStatus = useWorkoutStore((s) => s.status);
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const exercise = data?.[0];

  // --- Loading state ---
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-page items-center justify-center">
        <ActivityIndicator color={Colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  // --- Not found state (invalid ID or stale deep link) ---
  if (!exercise) {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <View className="flex-row items-center px-4 pt-4 mb-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="min-h-tap min-w-[44px] justify-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconChevronLeft size={24} color={Colors.label} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <IconAlertCircle size={40} color={Colors.coral} />
          <Text className="text-primary text-subtitle mt-4 text-center">
            Exercise not found
          </Text>
          <Text className="text-ambient text-body-sm mt-2 text-center">
            This exercise may have been removed or the link is invalid.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="bg-card rounded-btn min-h-btn-sm px-6 items-center justify-center mt-6 border-[0.5px] border-border-subtle"
            accessibilityRole="button"
            accessibilityLabel="Go back to library"
          >
            <Text className="text-ambient text-body-sm">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Parse secondary muscles with Zod ---
  const rawMuscles = exercise.secondary_muscles;
  const secondaryMuscles = secondaryMusclesParser.parse(
    typeof rawMuscles === 'string' ? JSON.parse(rawMuscles) : rawMuscles,
  );

  // --- Parse instructions (newline-separated steps) ---
  const instructions = (String(exercise.instructions ?? ''))
    .split('\n')
    .filter((s) => s.trim());

  const name = String(exercise.name ?? 'Unknown Exercise');
  const targetMuscle = exercise.target_muscle ? String(exercise.target_muscle) : null;
  const bodyPart = exercise.body_part ? String(exercise.body_part) : null;

  const handleAddToWorkout = useCallback(() => {
    if (workoutStatus === 'active' && exerciseId) {
      addExercise({
        exerciseId,
        exerciseName: name,
        equipmentCategory: null,
        gymEquipmentInstanceId: null,
        targetSets: 3,
        targetReps: 10,
        restSeconds: 90,
        weightIncrement: 2.5,
        incrementUnit: 'kg',
      });
      router.back();
    } else {
      router.push('/(lifter)/(workout)' as Href);
    }
  }, [workoutStatus, exerciseId, addExercise, name, router]);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 mb-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="min-h-tap min-w-[44px] justify-center"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <IconChevronLeft size={24} color={Colors.label} />
          </Pressable>
        </View>

        {/* Video placeholder */}
        <View className="mx-4 mb-4">
          <View className="bg-stat-tile rounded-card-hero aspect-video items-center justify-center">
            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(15,110,86,0.5)' }}>
              <IconPlayerPlay size={28} color={Colors.primary} />
            </View>
            <Text className="text-ambient text-body-sm mt-2">Exercise demo</Text>
          </View>
        </View>

        {/* Title + metadata */}
        <View className="px-4 mb-4">
          <Text
            className="text-primary text-title mb-1"
            accessibilityRole="header"
          >
            {name}
          </Text>
          <View className="flex-row items-center flex-wrap gap-1">
            {targetMuscle && (
              <View className="bg-stat-tile px-2 py-0.5 rounded-pill">
                <Text className="text-ambient text-label-xs capitalize">{targetMuscle}</Text>
              </View>
            )}
            {bodyPart && (
              <View className="bg-stat-tile px-2 py-0.5 rounded-pill">
                <Text className="text-ambient text-label-xs capitalize">{bodyPart}</Text>
              </View>
            )}
            {secondaryMuscles.map((muscle) => (
              <View key={muscle} className="bg-stat-tile px-2 py-0.5 rounded-pill">
                <Text className="text-label text-label-xs capitalize">{muscle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Personal stats (placeholder — zeros for new users) */}
        <View className="mx-4 mb-4">
          <Text
            className="text-label text-label-xs uppercase tracking-widest mb-2"
            accessibilityRole="header"
          >
            YOUR NUMBERS
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-1 bg-card rounded-card p-3 border-[0.5px] border-border-subtle">
              <Text className="text-label text-label-xs uppercase tracking-widest">Est. 1RM</Text>
              <Text className="text-primary text-hero-num font-medium">—</Text>
            </View>
            <View className="flex-1 bg-card rounded-card p-3 border-[0.5px] border-border-subtle">
              <Text className="text-label text-label-xs uppercase tracking-widest">Best set</Text>
              <Text className="text-primary text-hero-num font-medium">—</Text>
            </View>
            <View className="flex-1 bg-card rounded-card p-3 border-[0.5px] border-border-subtle">
              <Text className="text-label text-label-xs uppercase tracking-widest">Total reps</Text>
              <Text className="text-primary text-hero-num font-medium">—</Text>
            </View>
          </View>
        </View>

        {/* Add to workout CTA */}
        <View className="mx-4 mb-4">
          <Pressable
            onPress={handleAddToWorkout}
            className="bg-accent rounded-btn min-h-btn items-center justify-center flex-row gap-2"
            accessibilityRole="button"
            accessibilityLabel={`Add ${name} to workout`}
          >
            <IconPlus size={18} color={Colors.accentText} />
            <Text className="text-accent-text text-[14px] font-medium">Add to workout</Text>
          </Pressable>
        </View>

        {/* Progress sparkline placeholder */}
        <View className="mx-4 mb-4">
          <View className="bg-card rounded-card p-card-pad border-[0.5px] border-border-subtle">
            <Text
              className="text-label text-label-xs uppercase tracking-widest mb-2"
              accessibilityRole="header"
            >
              YOUR PROGRESS
            </Text>
            <View className="h-16 items-center justify-center">
              <Text className="text-ambient text-body-sm">
                Complete workouts with this exercise to see your progress chart.
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        {instructions.length > 0 && (
          <View className="mx-4 mb-4">
            <Text
              className="text-label text-label-xs uppercase tracking-widest mb-2"
              accessibilityRole="header"
            >
              HOW TO PERFORM
            </Text>
            {instructions.map((step, i) => (
              <View key={`step-${i}`} className="flex-row items-start mb-3">
                <View className="w-6 h-6 rounded-pill bg-stat-tile items-center justify-center mr-3 mt-0.5">
                  <Text className="text-ambient text-label-xs">{i + 1}</Text>
                </View>
                <Text className="text-primary text-body-sm flex-1 leading-5">{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View className="mx-4 mb-4">
          <View className="flex-row items-start bg-card rounded-card p-3 border-[0.5px] border-border-subtle">
            <IconInfoCircle size={14} color={Colors.label} style={{ marginTop: 2 }} />
            <Text className="text-label text-[10px] ml-2 flex-1 leading-4">
              For personal fitness tracking only. Not a medical assessment.
            </Text>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
