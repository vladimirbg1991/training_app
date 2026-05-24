import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ActiveWorkoutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 3
        </Text>
        <Text className="text-primary text-title mb-2">
          Active Workout
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          The real-time workout logging screen. Log sets, track rest timers,
          and add exercises on the fly. Data is saved to SQLite on every action.
        </Text>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Rest Timer</Text>
          <Text className="text-ambient text-body-sm">
            Live Activity / Dynamic Island integration (Phase 1)
          </Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Set Logger</Text>
          <Text className="text-ambient text-body-sm">
            Two-tap set logging with weight, reps, and RPE
          </Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Exercise Queue</Text>
          <Text className="text-ambient text-body-sm">
            Reorderable list of exercises in the current workout
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
