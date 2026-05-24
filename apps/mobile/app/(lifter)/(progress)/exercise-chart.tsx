import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ExerciseChartScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 21
        </Text>
        <Text className="text-primary text-title mb-2">
          Exercise Progress
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Chart your estimated 1RM, volume, and top set over time for any
          exercise.
        </Text>

        {/* Chart placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap h-48 items-center justify-center">
          <Text className="text-ambient text-body-sm">Chart placeholder</Text>
          <Text className="text-label text-label-xs mt-2">
            1RM trend line will render here
          </Text>
        </View>

        {/* Time range selector */}
        <View className="flex-row mb-4">
          {['1M', '3M', '6M', '1Y', 'All'].map((range) => (
            <Pressable
              key={range}
              className="flex-1 bg-stat-tile rounded-pill py-2 items-center mx-1"
            >
              <Text className="text-label text-body-sm">{range}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recent sets */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-2">Recent Sets</Text>
          <Text className="text-ambient text-body-sm">80kg x 8 @ RPE 8 — Today</Text>
          <Text className="text-ambient text-body-sm">77.5kg x 8 @ RPE 8.5 — Mon</Text>
          <Text className="text-ambient text-body-sm">75kg x 10 @ RPE 9 — Last Thu</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
