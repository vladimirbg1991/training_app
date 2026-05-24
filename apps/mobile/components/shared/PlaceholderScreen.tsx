import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Screen } from '../ui/Screen';

interface PlaceholderScreenProps {
  title: string;
  screenNumber?: string;
  description?: string;
  showBack?: boolean;
}

export function PlaceholderScreen({ title, screenNumber, description, showBack = false }: PlaceholderScreenProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Screen>
      <View className="flex-1 px-4 pt-4">
        {showBack && (
          <Pressable onPress={() => router.back()} className="mb-4">
            <Text className="text-label text-subtitle">← Back</Text>
          </Pressable>
        )}
        {screenNumber && (
          <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
            {screenNumber}
          </Text>
        )}
        <Text className="text-primary text-title mb-2">{title}</Text>
        {description && (
          <Text className="text-ambient text-body-sm mb-4">{description}</Text>
        )}
        <View className="bg-card rounded-card p-card-pad mt-4">
          <Text className="text-label text-label-xs uppercase tracking-widest mb-1">Route</Text>
          <Text className="text-ambient text-body-sm font-mono">{pathname}</Text>
        </View>
      </View>
    </Screen>
  );
}
