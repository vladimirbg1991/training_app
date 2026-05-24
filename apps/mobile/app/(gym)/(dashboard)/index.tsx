import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GymDashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 33
        </Text>
        <Text className="text-primary text-title mb-2">Gym Dashboard</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Real-time overview of your gym operations and member activity.
        </Text>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Floor Activity</Text>
          <Text className="text-ambient text-body-sm">
            47 members currently training
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">
            Equipment Status
          </Text>
          <Text className="text-ambient text-body-sm">
            All equipment operational. 2 maintenance requests pending.
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Membership</Text>
          <Text className="text-ambient text-body-sm">
            342 active members. 12 new this month.
          </Text>
        </View>

        <View className="mt-4 gap-3">
          <Link href="/(gym)/(equipment)" className="text-label text-body">
            Manage Equipment
          </Link>
          <Link href="/(gym)/(members)" className="text-label text-body">
            View Members
          </Link>
          <Link href="/(gym)/(insights)" className="text-label text-body">
            View Insights
          </Link>
          <Link href="/(gym)/(settings)" className="text-label text-body">
            Gym Settings
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
