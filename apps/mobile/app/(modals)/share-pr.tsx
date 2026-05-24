import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SharePrScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="self-start mb-4">
          <Text className="text-label text-subtitle">{'\u2715'} Close</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 35
        </Text>
        <Text className="text-primary text-title mb-2">Share Your PR</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Create a shareable card celebrating your personal record.
        </Text>

        {/* Share card preview placeholder */}
        <View className="mb-6 rounded-2xl border border-border-subtle bg-card p-6">
          <View className="items-center mb-4">
            <Text className="text-[40px] mb-2">{'\u{1F3C6}'}</Text>
            <Text className="text-label text-subtitle mb-1">NEW PR!</Text>
          </View>

          <View className="items-center mb-4">
            <Text className="text-primary text-[32px] font-bold">100 kg</Text>
            <Text className="text-ambient text-body-sm">Bench Press</Text>
          </View>

          <View className="flex-row justify-center gap-6">
            <View className="items-center">
              <Text className="text-label text-subtitle">Previous</Text>
              <Text className="text-ambient text-body-sm">95 kg</Text>
            </View>
            <View className="items-center">
              <Text className="text-label text-subtitle">Improvement</Text>
              <Text className="text-ambient text-body-sm">+5.3%</Text>
            </View>
          </View>
        </View>

        <Pressable className="items-center rounded-card bg-accent py-3 mb-3">
          <Text className="text-primary text-subtitle">Share to Story</Text>
        </Pressable>

        <Pressable className="items-center rounded-card border border-border-subtle py-3">
          <Text className="text-label text-subtitle">Save to Photos</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
