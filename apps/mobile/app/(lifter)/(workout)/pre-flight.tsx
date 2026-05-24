import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function PreFlightScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 16
        </Text>
        <Text className="text-primary text-title mb-2">
          Pre-flight Check
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Review the routine before starting. Reorder exercises, adjust target
          sets/reps, and swap equipment variants.
        </Text>

        {/* Routine summary placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">Push Day A</Text>
          <Text className="text-ambient text-body-sm">5 exercises, ~45 min estimated</Text>
        </View>

        {/* Exercise list placeholder */}
        {['Bench Press 4x8', 'OHP 3x10', 'Incline DB 3x12', 'Cable Fly 3x15', 'Tricep Dips 3x12'].map(
          (exercise, index) => (
            <View
              key={exercise}
              className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center"
            >
              <View className="w-8 h-8 rounded-full bg-stat-tile items-center justify-center mr-3">
                <Text className="text-label text-body-sm">{index + 1}</Text>
              </View>
              <Text className="text-primary text-subtitle flex-1">{exercise}</Text>
              <Text className="text-ambient text-body-sm">{'\u2261'}</Text>
            </View>
          ),
        )}

        {/* Start button */}
        <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center mt-4 mb-8">
          <Text className="text-accent-text text-subtitle">Start Workout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
