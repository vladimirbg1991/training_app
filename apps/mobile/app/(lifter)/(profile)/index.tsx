import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function ProfileSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 27
        </Text>
        <Text className="text-primary text-title mb-2">
          Profile & Settings
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Manage your account, subscription, offline content, and integrations.
        </Text>

        {/* User card placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-6 flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-stat-tile items-center justify-center mr-4">
            <Text className="text-primary text-title">VS</Text>
          </View>
          <View className="flex-1">
            <Text className="text-primary text-subtitle">Vladimir S.</Text>
            <Text className="text-ambient text-body-sm">Lifter since May 2026</Text>
          </View>
        </View>

        {/* Navigation cards */}
        <Link href="/(lifter)/(profile)/my-gyms" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">My Gyms</Text>
            <Text className="text-label text-body-sm">Screen 8 — Saved gyms and QR codes</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(profile)/subscription" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Pulse Premium</Text>
            <Text className="text-label text-body-sm">Screen 25 — Subscription management</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(profile)/offline-downloads" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Offline Downloads</Text>
            <Text className="text-label text-body-sm">Screen 28 — Manage cached videos and data</Text>
          </Pressable>
        </Link>

        <Link href="/(lifter)/(profile)/health-integration" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Apple Health</Text>
            <Text className="text-label text-body-sm">Screen 29 — HealthKit / Health Connect sync</Text>
          </Pressable>
        </Link>

        {/* Settings section */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-3 mt-4">
          Settings
        </Text>

        <View className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center justify-between">
          <Text className="text-primary text-subtitle">Unit System</Text>
          <Text className="text-label text-body-sm">Metric (kg)</Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center justify-between">
          <Text className="text-primary text-subtitle">Rest Timer Default</Text>
          <Text className="text-label text-body-sm">90s</Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center justify-between">
          <Text className="text-primary text-subtitle">Haptic Feedback</Text>
          <Text className="text-label text-body-sm">On</Text>
        </View>

        <Pressable className="rounded-btn min-h-btn items-center justify-center border border-coral mt-4 mb-8">
          <Text className="text-coral text-subtitle">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
