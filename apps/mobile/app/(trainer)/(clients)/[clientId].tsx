import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClientDetailScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 32
        </Text>
        <Text className="text-primary text-title mb-2">Client Detail</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Client ID: {clientId}
        </Text>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">
            Training History
          </Text>
          <Text className="text-ambient text-body-sm">
            24 sessions completed
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Current Program</Text>
          <Text className="text-ambient text-body-sm">
            Upper/Lower Split - Week 6
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <Text className="text-label text-subtitle mb-2">Recent PRs</Text>
          <Text className="text-ambient text-body-sm">
            Bench Press: 100 kg, Squat: 140 kg
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          className="mt-4"
        >
          <Text className="text-label text-body">Back to Client List</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
