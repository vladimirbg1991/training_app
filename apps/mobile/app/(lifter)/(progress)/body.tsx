import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function BodyMeasurementsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 22
        </Text>
        <Text className="text-primary text-title mb-2">
          Body Measurements
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Track body weight, body fat percentage, and progress photos over
          time. Body weight is also used for bodyweight-loaded exercise tracking.
        </Text>

        {/* Current stats */}
        <View className="flex-row mb-4">
          <View className="flex-1 bg-stat-tile rounded-card p-card-pad mr-2">
            <Text className="text-ambient text-body-sm">Body Weight</Text>
            <Text className="text-primary text-hero-num">82.5</Text>
            <Text className="text-label text-body-sm">kg</Text>
          </View>
          <View className="flex-1 bg-stat-tile rounded-card p-card-pad ml-2">
            <Text className="text-ambient text-body-sm">Body Fat</Text>
            <Text className="text-primary text-hero-num">14.2</Text>
            <Text className="text-label text-body-sm">%</Text>
          </View>
        </View>

        {/* Chart placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap h-40 items-center justify-center">
          <Text className="text-ambient text-body-sm">Weight trend chart placeholder</Text>
        </View>

        {/* Log entry button */}
        <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center mb-8">
          <Text className="text-accent-text text-subtitle">Log Measurement</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
