import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-6 justify-center">
        {/* Wordmark */}
        <Text className="text-accent text-display mb-2">Pulse</Text>
        <Text className="text-primary text-title mb-8">
          Train with intent.
        </Text>

        {/* Feature bullets */}
        <View className="mb-10">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-full bg-stat-tile items-center justify-center mr-3">
              <Text className="text-label text-body-sm">2</Text>
            </View>
            <View className="flex-1">
              <Text className="text-primary text-subtitle">Two taps to log a set</Text>
              <Text className="text-ambient text-body-sm">The fastest workout logger ever built.</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-full bg-stat-tile items-center justify-center mr-3">
              <Text className="text-label text-body-sm">~</Text>
            </View>
            <View className="flex-1">
              <Text className="text-primary text-subtitle">Works offline</Text>
              <Text className="text-ambient text-body-sm">No signal in the gym? No problem.</Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-stat-tile items-center justify-center mr-3">
              <Text className="text-label text-body-sm">*</Text>
            </View>
            <View className="flex-1">
              <Text className="text-primary text-subtitle">Private by default</Text>
              <Text className="text-ambient text-body-sm">Your data stays yours. Always.</Text>
            </View>
          </View>
        </View>

        {/* CTAs */}
        <Link href="/(auth)/user-type" asChild>
          <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center mb-3">
            <Text className="text-accent-text text-subtitle">Get started</Text>
          </Pressable>
        </Link>

        <Link href="/(auth)/sign-in" asChild>
          <Pressable className="rounded-btn min-h-btn items-center justify-center border border-border-subtle">
            <Text className="text-label text-subtitle">I already have an account</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
