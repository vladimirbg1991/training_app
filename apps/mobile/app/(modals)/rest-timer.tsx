import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RestTimerScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="self-start mb-4">
          <Text className="text-label text-subtitle">{'\u2715'} Close</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 18
        </Text>
        <Text className="text-primary text-title mb-6">Rest Timer</Text>

        {/* Large timer circle placeholder */}
        <View className="items-center justify-center my-8">
          <View className="h-56 w-56 items-center justify-center rounded-full border-4 border-accent">
            <Text className="text-primary text-[48px] font-bold">1:30</Text>
            <Text className="text-ambient text-body-sm mt-1">remaining</Text>
          </View>
        </View>

        <Text className="text-ambient text-body-sm text-center mb-8">
          Rest between sets. Timer will trigger a haptic pulse and notification
          when complete.
        </Text>

        {/* Quick-select durations */}
        <View className="flex-row justify-center gap-3 mb-6">
          {['0:30', '1:00', '1:30', '2:00', '3:00'].map((duration) => (
            <Pressable
              key={duration}
              className="rounded-card border border-border-subtle px-4 py-2"
            >
              <Text className="text-label text-body-sm">{duration}</Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row justify-center gap-4">
          <Pressable className="rounded-card bg-accent px-8 py-3">
            <Text className="text-primary text-subtitle">Start</Text>
          </Pressable>
          <Pressable className="rounded-card border border-border-subtle px-8 py-3">
            <Text className="text-label text-subtitle">Reset</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
