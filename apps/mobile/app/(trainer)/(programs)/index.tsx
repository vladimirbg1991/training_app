import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProgramsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Programs
        </Text>
        <Text className="text-primary text-title mb-2">Programs</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Create and manage training programs for your clients.
        </Text>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-ambient text-body-sm">
            Program builder coming soon. Design periodized training blocks and
            assign them to clients.
          </Text>
        </View>

        <View className="mt-4">
          <Link href="/(trainer)/(home)" className="text-label text-body">
            Back to Dashboard
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
