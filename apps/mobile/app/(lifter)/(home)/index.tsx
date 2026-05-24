import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 2
        </Text>
        <Text className="text-primary text-title mb-2">
          Home
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Your dashboard. Quick-start a workout, resume where you left off, or
          scan a gym QR code.
        </Text>

        {/* Navigation cards */}
        <Link href="/(lifter)/(home)/active-workout" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Active Workout</Text>
            <Text className="text-label text-body-sm">Screen 3 — Start or resume a workout</Text>
          </Pressable>
        </Link>

        <Link href="/(modals)/routine-builder" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Routine Builder</Text>
            <Text className="text-label text-body-sm">Screen 4 — Build and manage your routines</Text>
          </Pressable>
        </Link>

        <Link href="/(modals)/qr-scan" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">QR Scan</Text>
            <Text className="text-label text-body-sm">Screen 17 — Scan a gym QR code to prefill equipment</Text>
          </Pressable>
        </Link>

        <Link href="/(modals)/rest-timer" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Rest Timer</Text>
            <Text className="text-label text-body-sm">Screen 18 — Full-screen rest timer</Text>
          </Pressable>
        </Link>

        <Link href="/(modals)/notifications" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Notifications</Text>
            <Text className="text-label text-body-sm">Screen 26 — Push and in-app notifications</Text>
          </Pressable>
        </Link>

        <Link href="/(modals)/share-pr" asChild>
          <Pressable className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">Share PR</Text>
            <Text className="text-label text-body-sm">Screen 35 — Share your personal record</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
