import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconChevronLeft,
  IconBuilding,
  IconBarbell,
  IconQrcode,
  IconInfoCircle,
} from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';

export default function MyGymsScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 mb-4">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="min-h-tap min-w-[44px] justify-center"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <IconChevronLeft size={24} color={Colors.label} />
        </Pressable>
        <Text className="text-primary text-subtitle flex-1 text-center">
          My Gyms
        </Text>
        {/* + Add placeholder — disabled for v0 */}
        <Pressable
          hitSlop={8}
          className="min-h-tap min-w-[44px] items-end justify-center opacity-40"
          accessibilityRole="button"
          accessibilityLabel="Add gym (coming soon)"
          disabled
        >
          <Text className="text-label text-body-sm">+ Add</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Current Gym — Hero card */}
        <View className="bg-hero rounded-card-hero p-card-pad mb-card-gap">
          <Text className="text-primary/70 text-label-xs uppercase tracking-widest mb-1">
            Current Gym
          </Text>
          <View className="flex-row items-center mb-3">
            <IconBuilding size={28} color={Colors.primary} />
            <Text className="text-primary text-title ml-3">
              No gym selected
            </Text>
          </View>
          <Text className="text-primary/80 text-body-sm mb-4">
            Select a gym to filter exercises by available equipment.
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 bg-page/20 rounded-btn min-h-btn-sm items-center justify-center opacity-50"
              disabled
              accessibilityRole="button"
              accessibilityLabel="See equipment (coming soon)"
            >
              <Text className="text-primary text-body-sm">See equipment</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-page/20 rounded-btn min-h-btn-sm items-center justify-center opacity-50"
              disabled
              accessibilityRole="button"
              accessibilityLabel="Report missing equipment (coming soon)"
            >
              <Text className="text-primary text-body-sm">Report missing</Text>
            </Pressable>
          </View>
        </View>

        {/* How Gyms Work — info card */}
        <View className="bg-card rounded-card p-card-pad mb-card-gap border-[0.5px] border-border-subtle">
          <View className="flex-row items-center mb-3">
            <IconInfoCircle size={20} color={Colors.label} />
            <Text className="text-label text-label-xs uppercase tracking-widest ml-2">
              How Gyms Work
            </Text>
          </View>
          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <IconBarbell size={18} color={Colors.ambient} />
              <Text className="text-primary text-body-sm ml-3 flex-1">
                Your current gym filters the exercise library to equipment
                that's actually available at your location.
              </Text>
            </View>
            <View className="flex-row items-start mb-2">
              <IconQrcode size={18} color={Colors.ambient} />
              <Text className="text-primary text-body-sm ml-3 flex-1">
                Scanning a gym's QR code adds it to your list and
                auto-configures equipment availability.
              </Text>
            </View>
            <View className="flex-row items-start">
              <IconBuilding size={18} color={Colors.ambient} />
              <Text className="text-primary text-body-sm ml-3 flex-1">
                Gym operators maintain equipment lists. When they update, your
                library filter updates automatically.
              </Text>
            </View>
          </View>
        </View>

        {/* Coming Soon notice */}
        <View className="bg-stat-tile rounded-card p-card-pad items-center">
          <Text className="text-label text-subtitle mb-2">Coming Soon</Text>
          <Text className="text-ambient text-body-sm text-center">
            Gym selection and equipment-based filtering are under development.
            For now, all exercises are available regardless of gym selection.
          </Text>
          <Text className="text-ambient/60 text-body-sm text-center mt-3">
            The gyms table, QR scanning, and equipment linking will ship in a
            future update.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
