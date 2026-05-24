import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['All', 'Workouts', 'Social', 'System'] as const;

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="self-start mb-4">
          <Text className="text-label text-subtitle">{'\u2715'} Close</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 26
        </Text>
        <Text className="text-primary text-title mb-2">Notifications</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Your notification inbox. Filter by category.
        </Text>

        {/* Category filters */}
        <View className="flex-row gap-2 mb-6">
          {CATEGORIES.map((category, index) => (
            <Pressable
              key={category}
              className={`rounded-full px-4 py-2 ${
                index === 0 ? 'bg-accent' : 'border border-border-subtle'
              }`}
            >
              <Text
                className={`text-body-sm ${
                  index === 0 ? 'text-primary' : 'text-label'
                }`}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Notification items placeholder */}
        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <View className="flex-row items-center mb-1">
            <Text className="text-label text-subtitle flex-1">
              New PR recorded
            </Text>
            <Text className="text-ambient text-label-xs">2m ago</Text>
          </View>
          <Text className="text-ambient text-body-sm">
            You hit a new personal record on Bench Press: 100 kg!
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <View className="flex-row items-center mb-1">
            <Text className="text-label text-subtitle flex-1">
              Rest day reminder
            </Text>
            <Text className="text-ambient text-label-xs">1h ago</Text>
          </View>
          <Text className="text-ambient text-body-sm">
            You have trained 4 days in a row. Consider a rest day for optimal
            recovery.
          </Text>
        </View>

        <View className="mb-4 rounded-card border border-border-subtle p-4">
          <View className="flex-row items-center mb-1">
            <Text className="text-label text-subtitle flex-1">
              Workout completed
            </Text>
            <Text className="text-ambient text-label-xs">Yesterday</Text>
          </View>
          <Text className="text-ambient text-body-sm">
            Upper Body Push session logged. 18 sets, 42 min.
          </Text>
        </View>

        <View className="items-center py-8">
          <Text className="text-ambient text-body-sm">
            No more notifications
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
