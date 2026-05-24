import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TrainerDashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 30
        </Text>
        <Text className="text-primary text-title mb-2">Trainer Dashboard</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Overview of your training practice, client activity, and upcoming
          sessions.
        </Text>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Active Roster</Text>
          <Text className="text-ambient text-body-sm">
            12 active clients this week
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Needs Attention</Text>
          <Text className="text-ambient text-body-sm">
            3 clients missed sessions this week
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Recent Wins</Text>
          <Text className="text-ambient text-body-sm">
            5 new PRs across your roster
          </Text>
        </View>

        <View className="mt-4 gap-3">
          <Link href="/(trainer)/(clients)" className="text-label text-body">
            View Clients
          </Link>
          <Link href="/(trainer)/(programs)" className="text-label text-body">
            View Programs
          </Link>
          <Link href="/(trainer)/(messages)" className="text-label text-body">
            View Messages
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
