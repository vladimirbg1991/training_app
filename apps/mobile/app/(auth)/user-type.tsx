import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconChevronLeft,
  IconBarbell,
  IconClipboardList,
  IconBuilding,
  IconCircleCheck,
  IconCircle,
} from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';
import type { UserType } from '@gym-app/domain';

const USER_TYPE_OPTIONS: {
  key: UserType;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}[] = [

  {
    key: 'lifter',
    title: 'Lifter',
    subtitle: 'Track your own workouts and progress.',
    Icon: IconBarbell,
  },
  {
    key: 'trainer',
    title: 'Personal trainer',
    subtitle: 'Build programs and manage clients.',
    Icon: IconClipboardList,
  },
  {
    key: 'gym',
    title: 'Gym operator',
    subtitle: 'Manage your gym, QR codes, and members.',
    Icon: IconBuilding,
  },
];

export default function UserTypeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [selected, setSelected] = useState<UserType>('lifter');
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleContinue() {
    if (!user) return;

    setIsUpdating(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          userType: selected,
        },
      });
      router.replace('/(auth)/health-consent');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-6 pt-4">
        {/* Header: back + progress */}
        <View className="flex-row items-center justify-between mb-8">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="min-h-tap min-w-[44px] justify-center"
          >
            <IconChevronLeft size={24} color={Colors.label} />
          </Pressable>

          {/* Progress dots: 3 total, dot 1 active */}
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-accent" />
            <View className="w-2 h-2 rounded-full bg-stat-tile" />
            <View className="w-2 h-2 rounded-full bg-stat-tile" />
          </View>

          {/* Spacer to balance the back button */}
          <View className="min-w-[44px]" />
        </View>

        {/* Headline */}
        <Text className="text-primary text-[22px] font-medium mb-1">
          How will you use this?
        </Text>
        <Text className="text-ambient text-body-sm mb-8">
          Pick one. You can change it later.
        </Text>

        {/* Selection cards */}
        {USER_TYPE_OPTIONS.map((option) => {
          const isSelected = selected === option.key;

          return (
            <Pressable
              key={option.key}
              onPress={() => setSelected(option.key)}
              className={`flex-row items-center rounded-card p-card-pad mb-card-gap h-20 ${
                isSelected
                  ? 'bg-hero border-[1.5px] border-border-active'
                  : 'bg-card border-[0.5px] border-border-subtle'
              }`}
            >
              {/* Icon tile */}
              <View
                className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${
                  isSelected ? 'bg-accent' : 'bg-stat-tile'
                }`}
              >
                <option.Icon
                  size={20}
                  color={isSelected ? Colors.accentText : Colors.label}
                />
              </View>

              {/* Text */}
              <View className="flex-1">
                <Text className="text-primary text-subtitle">{option.title}</Text>
                <Text className="text-ambient text-body-sm">{option.subtitle}</Text>
              </View>

              {/* Selection indicator */}
              {isSelected ? (
                <IconCircleCheck size={22} color={Colors.label} />
              ) : (
                <IconCircle size={22} color={Colors.borderSubtle} />
              )}
            </Pressable>
          );
        })}

        {/* Continue button */}
        <View className="mt-auto mb-8">
          <Pressable
            onPress={handleContinue}
            disabled={isUpdating}
            className="bg-accent rounded-btn min-h-btn items-center justify-center flex-row"
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={Colors.accentText} />
            ) : (
              <Text className="text-accent-text text-subtitle">Continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
