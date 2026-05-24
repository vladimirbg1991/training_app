import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ActiveWorkoutFromTabScreen() {
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
          The real-time workout logging screen (reachable from Workout tab).
          Log sets, track rest timers, and add exercises on the fly.
        </Text>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Workout Timer</Text>
          <View className="bg-stat-tile rounded-btn p-3 mt-2 items-center">
            <Text className="text-primary text-hero-num">00:00</Text>
            <Text className="text-ambient text-body-sm">Elapsed time</Text>
          </View>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Exercise Queue</Text>
          <Text className="text-ambient text-body-sm">
            No exercises added yet. Tap + to add exercises.
          </Text>
        </View>

        <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center mt-4">
          <Text className="text-accent-text text-subtitle">Finish Workout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
