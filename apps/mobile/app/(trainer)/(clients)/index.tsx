import { View, Text, ScrollView, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_CLIENTS = [
  { id: 'client-001', name: 'Alex Rivera', status: 'Active' },
  { id: 'client-002', name: 'Jordan Lee', status: 'Active' },
  { id: 'client-003', name: 'Casey Morgan', status: 'Needs Attention' },
];

export default function ClientListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 31
        </Text>
        <Text className="text-primary text-title mb-2">Client List</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Manage your training roster. Tap a client for details.
        </Text>

        {MOCK_CLIENTS.map((client) => (
          <Pressable
            key={client.id}
            onPress={() =>
              router.push(`/(trainer)/(clients)/${client.id}` as const)
            }
            className="mb-3 rounded-card border border-border-subtle p-4"
          >
            <Text className="text-primary text-subtitle">{client.name}</Text>
            <Text className="text-ambient text-body-sm">{client.status}</Text>
          </Pressable>
        ))}

        <View className="mt-4">
          <Link href="/(trainer)/(home)" className="text-label text-body">
            Back to Dashboard
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
