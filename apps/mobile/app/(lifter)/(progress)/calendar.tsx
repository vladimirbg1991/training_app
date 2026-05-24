import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function CalendarStreakScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 24
        </Text>
        <Text className="text-primary text-title mb-2">
          Calendar & Streak
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Heatmap calendar of your training days, plus current and longest
          streaks.
        </Text>

        {/* Streak stats */}
        <View className="flex-row mb-4">
          <View className="flex-1 bg-stat-tile rounded-card p-card-pad mr-2 items-center">
            <Text className="text-primary text-hero-num">12</Text>
            <Text className="text-label text-body-sm">Current streak</Text>
          </View>
          <View className="flex-1 bg-stat-tile rounded-card p-card-pad ml-2 items-center">
            <Text className="text-primary text-hero-num">28</Text>
            <Text className="text-label text-body-sm">Best streak</Text>
          </View>
        </View>

        {/* Calendar placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-3">May 2026</Text>
          <View className="h-48 items-center justify-center">
            <Text className="text-ambient text-body-sm">
              Heatmap calendar placeholder
            </Text>
            <Text className="text-label text-label-xs mt-2">
              Green squares for training days
            </Text>
          </View>
        </View>

        {/* Weekly summary */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-1">This Week</Text>
          <Text className="text-ambient text-body-sm">4 of 5 planned sessions completed</Text>
          <View className="flex-row mt-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <View
                key={`${day}-${i}`}
                className={`flex-1 h-8 rounded-sm mx-0.5 items-center justify-center ${
                  i < 4 ? 'bg-accent' : i === 4 ? 'bg-stat-tile' : 'bg-card'
                }`}
              >
                <Text className={`text-body-sm ${i < 4 ? 'text-accent-text' : 'text-ambient'}`}>
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
