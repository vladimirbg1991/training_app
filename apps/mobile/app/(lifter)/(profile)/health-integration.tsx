import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function HealthIntegrationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 29
        </Text>
        <Text className="text-primary text-title mb-2">
          Apple Health
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Sync workouts to HealthKit on iOS and Health Connect on Android.
          Deferred to Phase 2 — schema includes external_sync_id and
          sync_source columns from v0.
        </Text>

        {/* Integration status */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-primary text-subtitle">Apple Health</Text>
            <View className="bg-stat-tile rounded-pill px-3 py-1">
              <Text className="text-ambient text-body-sm">Not connected</Text>
            </View>
          </View>
          <Text className="text-ambient text-body-sm">
            Write workouts and read body measurements from Apple Health.
          </Text>
        </View>

        <View className="bg-card rounded-card p-card-pad mb-card-gap">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-primary text-subtitle">Health Connect</Text>
            <View className="bg-stat-tile rounded-pill px-3 py-1">
              <Text className="text-ambient text-body-sm">Not connected</Text>
            </View>
          </View>
          <Text className="text-ambient text-body-sm">
            Android equivalent of Apple Health. Same data types supported.
          </Text>
        </View>

        {/* Data types */}
        <Text className="text-label text-label-xs uppercase tracking-widest mb-3 mt-4">
          Synced Data Types
        </Text>

        {['Workouts (write)', 'Body Weight (read/write)', 'Body Fat % (read)', 'Active Energy (write)'].map(
          (dataType) => (
            <View
              key={dataType}
              className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center justify-between"
            >
              <Text className="text-primary text-body-sm">{dataType}</Text>
              <Text className="text-ambient text-body-sm">Phase 2</Text>
            </View>
          ),
        )}

        {/* Connect button */}
        <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center mt-4 mb-8 opacity-50">
          <Text className="text-accent-text text-subtitle">Connect Apple Health</Text>
        </Pressable>
        <Text className="text-ambient text-body-sm text-center mb-8 -mt-4">
          Coming in Phase 2
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
