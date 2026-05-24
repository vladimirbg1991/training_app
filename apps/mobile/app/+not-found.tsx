import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-ambient text-label-xs uppercase tracking-widest mb-2">
          404
        </Text>
        <Text className="text-primary text-title mb-2">
          Screen not found
        </Text>
        <Text className="text-ambient text-body-sm mb-8">
          The page you're looking for doesn't exist.
        </Text>
        <Link href="/(lifter)/(home)" asChild>
          <Pressable className="bg-accent rounded-btn min-h-btn px-6 items-center justify-center">
            <Text className="text-accent-text text-subtitle">Go Home</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
