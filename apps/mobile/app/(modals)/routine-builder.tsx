import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoutineBuilderScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="self-start mb-4">
          <Text className="text-label text-subtitle">{'\u2715'} Close</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 4
        </Text>
        <Text className="text-primary text-title mb-2">Routine Builder</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Create a new training routine. Add exercises, set rep schemes, and
          configure rest periods.
        </Text>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Routine Name</Text>
          <View className="rounded-btn-sm bg-card p-3">
            <Text className="text-ambient text-body-sm">
              Tap to name your routine...
            </Text>
          </View>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Exercises</Text>
          <Text className="text-ambient text-body-sm">
            No exercises added yet. Tap the button below to add your first
            exercise.
          </Text>
        </View>

        <Pressable className="mt-2 items-center rounded-card bg-accent py-3">
          <Text className="text-primary text-subtitle">+ Add Exercise</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
