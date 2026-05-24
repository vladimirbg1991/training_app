import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function WorkoutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Workout Tab
        </Text>
        <Text className="text-primary text-title mb-2">
          Workout
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Start a new workout, pick a routine, or continue where you left off.
        </Text>

        {/* Quick start */}
        <Link href="/(lifter)/(workout)/active" asChild>
          <Pressable className="bg-accent rounded-card p-card-pad mb-card-gap items-center">
            <Text className="text-accent-text text-subtitle">Start Empty Workout</Text>
          </Pressable>
        </Link>

        {/* Navigation cards */}
        <Link href="/(lifter)/(workout)/exercise-selector" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Exercise Selector</Text>
            <Text className="text-label text-body-sm">Screen 9 — Pick exercises for your workout</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(workout)/set-logger" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Set Logger</Text>
            <Text className="text-label text-body-sm">Screen 10/12 — The two-tap set logging interface</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(workout)/pre-flight" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Pre-flight Check</Text>
            <Text className="text-label text-body-sm">Screen 16 — Review before starting a routine</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
