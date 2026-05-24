import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function HistoryFeedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 20
        </Text>
        <Text className="text-primary text-title mb-2">
          History Feed
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Chronological feed of past workouts. Tap any workout to see full
          details, re-run it, or share it.
        </Text>

        {/* Placeholder workout entries */}
        {['Today — Push Day A', 'Yesterday — Pull Day B', 'Mon — Legs'].map((workout) => (
          <View key={workout} className="bg-card rounded-card p-card-pad mb-card-gap">
            <Text className="text-primary text-subtitle">{workout}</Text>
            <Text className="text-ambient text-body-sm">5 exercises, 18 sets, 42 min</Text>
            <View className="flex-row mt-2">
              <View className="bg-stat-tile rounded-pill px-2 py-1 mr-2">
                <Text className="text-label text-body-sm">12.4t volume</Text>
              </View>
              <View className="bg-stat-tile rounded-pill px-2 py-1">
                <Text className="text-label text-body-sm">2 PRs</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
