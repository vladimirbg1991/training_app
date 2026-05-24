import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ProgressDashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 19
        </Text>
        <Text className="text-primary text-title mb-2">
          Progress Dashboard
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Your training overview. Track volume trends, personal records, body
          composition, and workout streaks.
        </Text>

        {/* Stat tiles placeholder */}
        <View className="flex-row mb-4">
          <View className="flex-1 bg-stat-tile rounded-card p-card-pad mr-2">
            <Text className="text-ambient text-body-sm">This week</Text>
            <Text className="text-primary text-hero-num">4</Text>
            <Text className="text-label text-body-sm">workouts</Text>
          </View>
          <View className="flex-1 bg-stat-tile rounded-card p-card-pad ml-2">
            <Text className="text-ambient text-body-sm">Volume</Text>
            <Text className="text-primary text-hero-num">12.4t</Text>
            <Text className="text-label text-body-sm">total</Text>
          </View>
        </View>

        {/* Navigation cards */}
        <Link href="/(lifter)/(progress)/history" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">History Feed</Text>
            <Text className="text-label text-body-sm">Screen 20 — Browse past workouts</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/exercise-chart" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Exercise Progress</Text>
            <Text className="text-label text-body-sm">Screen 21 — Charts for individual exercises</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/body" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Body Measurements</Text>
            <Text className="text-label text-body-sm">Screen 22 — Weight, body fat, photos</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/records" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Personal Records</Text>
            <Text className="text-label text-body-sm">Screen 23 — PRs across all exercises</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(progress)/calendar" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Calendar & Streak</Text>
            <Text className="text-label text-body-sm">Screen 24 — Training calendar and streaks</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
