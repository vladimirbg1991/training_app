import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MembersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Members
        </Text>
        <Text className="text-primary text-title mb-2">Members</Text>
        <Text className="text-ambient text-body-sm mb-6">
          View and manage your gym membership roster.
        </Text>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-ambient text-body-sm">
            Member management coming soon. Member directory, check-in history,
            and membership tiers.
          </Text>
        </View>

        <View className="mt-4">
          <Link href="/(gym)/(dashboard)" className="text-label text-body">
            Back to Dashboard
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
