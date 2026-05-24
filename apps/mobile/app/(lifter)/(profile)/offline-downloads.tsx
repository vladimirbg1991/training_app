import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function OfflineDownloadsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 28
        </Text>
        <Text className="text-primary text-title mb-2">
          Offline Downloads
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Pre-cache exercise demo videos for your routines so they work in
          basement gyms with no signal. Uses expo-video-cache for HLS offline.
        </Text>

        {/* Storage usage */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <Text className="text-primary text-subtitle mb-2">Storage Used</Text>
          <View className="h-3 bg-stat-tile rounded-full overflow-hidden mb-2">
            <View className="h-3 bg-accent rounded-full" style={{ width: '35%' }} />
          </View>
          <Text className="text-ambient text-body-sm">142 MB of 500 MB used</Text>
        </View>

        {/* Downloaded routines */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-3 mt-2">
          Downloaded Routines
        </Text>

        <View className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center">
          <View className="flex-1">
            <Text className="text-primary text-subtitle">Push Day A</Text>
            <Text className="text-ambient text-body-sm">5 videos, 68 MB</Text>
          </View>
          <View className="bg-positive rounded-pill px-2 py-1">
            <Text className="text-page text-body-sm">Cached</Text>
          </View>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center">
          <View className="flex-1">
            <Text className="text-primary text-subtitle">Pull Day B</Text>
            <Text className="text-ambient text-body-sm">6 videos, 74 MB</Text>
          </View>
          <View className="bg-positive rounded-pill px-2 py-1">
            <Text className="text-page text-body-sm">Cached</Text>
          </View>
        </View>

        {/* Available for download */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-3 mt-4">
          Available
        </Text>

        <View className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center">
          <View className="flex-1">
            <Text className="text-primary text-subtitle">Legs</Text>
            <Text className="text-ambient text-body-sm">5 videos, ~60 MB</Text>
          </View>
          <Pressable className="bg-stat-tile rounded-pill px-3 py-1.5">
            <Text className="text-label text-body-sm">Download</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
