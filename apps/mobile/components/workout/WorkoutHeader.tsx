import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';
import { IconChevronLeft, IconDotsVertical } from '@tabler/icons-react-native';

interface WorkoutHeaderProps {
  breadcrumb: string;
  elapsedTime: string;
  progress: string;
  onBack: () => void;
  onMenu?: () => void;
}

export function WorkoutHeader({
  breadcrumb,
  elapsedTime,
  progress,
  onBack,
  onMenu,
}: WorkoutHeaderProps) {
  return (
    <View className="flex-row items-center px-1 py-1">
      {/* Back button */}
      <Pressable
        onPress={onBack}
        className="w-[44px] h-[44px] items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <IconChevronLeft size={24} color={Colors.primary} />
      </Pressable>

      {/* Center content */}
      <View className="flex-1 items-center">
        <Text className="text-label text-label-xs uppercase tracking-widest" numberOfLines={1}>
          {breadcrumb}
        </Text>
        <Text className="text-primary text-body-sm">
          {elapsedTime} &middot; {progress}
        </Text>
      </View>

      {/* Menu button */}
      {onMenu ? (
        <Pressable
          onPress={onMenu}
          className="w-[44px] h-[44px] items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Workout menu"
        >
          <IconDotsVertical size={20} color={Colors.label} />
        </Pressable>
      ) : (
        <View className="w-[44px]" />
      )}
    </View>
  );
}
