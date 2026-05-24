import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

export default function SubscriptionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <ScrollView className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="mb-4">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 25
        </Text>
        <Text className="text-primary text-title mb-2">
          Pulse Premium
        </Text>
        <Text className="text-ambient text-body-sm mb-6">
          Unlock advanced analytics, unlimited routines, video demos, and
          priority sync. Managed via RevenueCat.
        </Text>

        {/* Current plan */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap border border-border-subtle">
          <Text className="text-ambient text-body-sm">Current plan</Text>
          <Text className="text-primary text-title">Free</Text>
          <Text className="text-ambient text-body-sm mt-1">
            5 routines, basic progress charts
          </Text>
        </View>

        {/* Premium plan */}
        <View className="bg-card rounded-card-hero p-card-pad mb-card-gap border border-accent">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-primary text-title">Premium</Text>
            <View className="bg-accent rounded-pill px-3 py-1">
              <Text className="text-accent-text text-body-sm">Popular</Text>
            </View>
          </View>
          <Text className="text-primary text-hero-num mb-1">$9.99/mo</Text>
          <Text className="text-ambient text-body-sm mb-3">or $79.99/year (save 33%)</Text>
          <View className="mb-3">
            <Text className="text-primary text-body-sm mb-1">Unlimited routines</Text>
            <Text className="text-primary text-body-sm mb-1">Advanced analytics & 1RM tracking</Text>
            <Text className="text-primary text-body-sm mb-1">Exercise video demos</Text>
            <Text className="text-primary text-body-sm mb-1">Priority cloud sync</Text>
            <Text className="text-primary text-body-sm">Offline video caching</Text>
          </View>
          <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center">
            <Text className="text-accent-text text-subtitle">Start Free Trial</Text>
          </Pressable>
        </View>

        {/* Restore purchases */}
        <Pressable className="rounded-btn min-h-btn-sm items-center justify-center mb-8">
          <Text className="text-label text-body-sm">Restore purchases</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
