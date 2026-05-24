import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QrScanScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-4 pt-4">
        <Pressable onPress={() => router.back()} className="self-start mb-4">
          <Text className="text-label text-subtitle">{'\u2715'} Close</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 17
        </Text>
        <Text className="text-primary text-title mb-2">Scan Equipment</Text>
        <Text className="text-ambient text-body-sm mb-6">
          Point your camera at a gym equipment QR code to auto-fill exercise
          details.
        </Text>

        {/* Camera viewport placeholder */}
        <View className="flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-border-subtle mb-8">
          <View className="items-center">
            <Text className="text-[48px] mb-4">{'\u{1F4F7}'}</Text>
            <Text className="text-label text-subtitle mb-2">
              Camera Preview
            </Text>
            <Text className="text-ambient text-body-sm text-center px-8">
              Camera access required. The QR scanner will appear here once
              permissions are granted.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
