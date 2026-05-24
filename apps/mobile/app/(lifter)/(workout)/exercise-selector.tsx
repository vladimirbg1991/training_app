import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ExerciseSelectorScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 9
        </Text>
        <Text className="text-primary text-title mb-2">
          Exercise Selector
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Search and filter exercises to add to your workout. Supports muscle
          group, equipment, and movement pattern filters.
        </Text>

        {/* Search bar placeholder */}
        <View className="bg-card rounded-btn p-3 mb-4 border border-border-subtle">
          <Text className="text-ambient text-body-sm">Search exercises...</Text>
        </View>

        {/* Filter chips placeholder */}
        <View className="flex-row flex-wrap mb-4">
          {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map((muscle) => (
            <View
              key={muscle}
              className="bg-stat-tile rounded-pill px-3 py-1.5 mr-2 mb-2"
            >
              <Text className="text-label text-body-sm">{muscle}</Text>
            </View>
          ))}
        </View>

        {/* Example exercise items */}
        {['Bench Press', 'Incline DB Press', 'Cable Fly', 'Push-ups'].map((exercise) => (
          <Pressable
            key={exercise}
            className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center"
          >
            <View className="w-10 h-10 rounded-btn bg-stat-tile mr-3" />
            <View className="flex-1">
              <Text className="text-primary text-subtitle">{exercise}</Text>
              <Text className="text-ambient text-body-sm">Chest, Triceps</Text>
            </View>
            <Text className="text-accent text-subtitle">+</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
