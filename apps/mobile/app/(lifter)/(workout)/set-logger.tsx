import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function SetLoggerScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 10/12
        </Text>
        <Text className="text-primary text-title mb-2">
          Set Logger
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          The two-tap set logging interface. Enter weight and reps, then
          confirm. Supports RPE, tempo, and notes.
        </Text>

        {/* Weight input placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-label text-label-xs uppercase tracking-widest mb-2">Weight</Text>
          <View className="flex-row items-center justify-center">
            <Pressable className="bg-stat-tile rounded-btn w-12 h-12 items-center justify-center">
              <Text className="text-primary text-title">-</Text>
            </Pressable>
            <View className="mx-6 items-center">
              <Text className="text-primary text-hero-num">80.0</Text>
              <Text className="text-ambient text-body-sm">kg</Text>
            </View>
            <Pressable className="bg-stat-tile rounded-btn w-12 h-12 items-center justify-center">
              <Text className="text-primary text-title">+</Text>
            </Pressable>
          </View>
        </View>

        {/* Reps input placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-label text-label-xs uppercase tracking-widest mb-2">Reps</Text>
          <View className="flex-row items-center justify-center">
            <Pressable className="bg-stat-tile rounded-btn w-12 h-12 items-center justify-center">
              <Text className="text-primary text-title">-</Text>
            </Pressable>
            <View className="mx-6 items-center">
              <Text className="text-primary text-hero-num">8</Text>
            </View>
            <Pressable className="bg-stat-tile rounded-btn w-12 h-12 items-center justify-center">
              <Text className="text-primary text-title">+</Text>
            </Pressable>
          </View>
        </View>

        {/* RPE selector placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-label text-label-xs uppercase tracking-widest mb-2">RPE (optional)</Text>
          <View className="flex-row justify-between">
            {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((rpe) => (
              <View
                key={rpe}
                className="bg-stat-tile rounded-pill px-2 py-1"
              >
                <Text className="text-ambient text-body-sm">{rpe}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Log set button */}
        <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center mt-4">
          <Text className="text-accent-text text-subtitle">Log Set</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
