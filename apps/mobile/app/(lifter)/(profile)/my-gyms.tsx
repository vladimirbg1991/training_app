import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function MyGymsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 8
        </Text>
        <Text className="text-primary text-title mb-2">
          My Gyms
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Gyms you've scanned or saved. Each gym can prefill equipment
          availability and default settings.
        </Text>

        {/* Gym cards placeholder */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle">Iron Paradise</Text>
          <Text className="text-ambient text-body-sm">Last visited: May 23, 2026</Text>
          <View className="flex-row mt-2">
            <View className="bg-stat-tile rounded-pill px-2 py-1 mr-2">
              <Text className="text-label text-body-sm">Full rack</Text>
            </View>
            <View className="bg-stat-tile rounded-pill px-2 py-1">
              <Text className="text-label text-body-sm">Cables</Text>
            </View>
          </View>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle">Downtown Fitness</Text>
          <Text className="text-ambient text-body-sm">Last visited: May 19, 2026</Text>
          <View className="flex-row mt-2">
            <View className="bg-stat-tile rounded-pill px-2 py-1 mr-2">
              <Text className="text-label text-body-sm">Dumbbells</Text>
            </View>
            <View className="bg-stat-tile rounded-pill px-2 py-1">
              <Text className="text-label text-body-sm">Machines</Text>
            </View>
          </View>
        </View>

        {/* Scan button */}
        <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center mt-4">
          <Text className="text-accent-text text-subtitle">Scan Gym QR Code</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
