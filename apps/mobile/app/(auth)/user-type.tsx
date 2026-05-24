import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

type UserType = 'lifter' | 'trainer' | 'gym';

const USER_TYPES: { key: UserType; title: string; description: string; icon: string }[] = [
  {
    key: 'lifter',
    title: 'Lifter',
    description: 'Track your own workouts and progress.',
    icon: '\u{1F4AA}',
  },
  {
    key: 'trainer',
    title: 'Trainer',
    description: 'Build programs and manage clients.',
    icon: '\u{1F4CB}',
  },
  {
    key: 'gym',
    title: 'Gym Operator',
    description: 'Manage your gym, QR codes, and members.',
    icon: '\u{1F3E2}',
  },
];

export default function UserTypeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<UserType | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-6 pt-8">
        <Pressable onPress={() => router.back()} className="mb-6">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 1b
        </Text>
        <Text className="text-primary text-title mb-2">
          How will you use Pulse?
        </Text>
        <Text className="text-ambient text-body-sm mb-8">
          Choose your role. You can change this later.
        </Text>

        {/* Selection cards */}
        {USER_TYPES.map((type) => (
          <Pressable
            key={type.key}
            onPress={() => setSelected(type.key)}
            className={`rounded-card p-card-pad mb-card-gap flex-row items-center ${
              selected === type.key ? 'bg-stat-tile border border-accent' : 'bg-card border border-border-subtle'
            }`}
          >
            <Text className="text-2xl mr-3">{type.icon}</Text>
            <View className="flex-1">
              <Text className="text-primary text-subtitle">{type.title}</Text>
              <Text className="text-ambient text-body-sm">{type.description}</Text>
            </View>
          </Pressable>
        ))}

        {/* Continue button */}
        <View className="mt-auto mb-8">
          <Pressable
            onPress={() => {
              // TODO: Store user type in Clerk metadata, navigate to onboarding
              if (selected) {
                router.push('/(lifter)/(home)');
              }
            }}
            className={`rounded-btn min-h-btn items-center justify-center ${
              selected ? 'bg-accent' : 'bg-card'
            }`}
          >
            <Text
              className={`text-subtitle ${selected ? 'text-accent-text' : 'text-ambient'}`}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
