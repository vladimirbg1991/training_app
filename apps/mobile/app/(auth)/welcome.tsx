import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconBarbell,
  IconBolt,
  IconWifiOff,
  IconShieldCheck,
} from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';

const FEATURES = [
  {
    Icon: IconBolt,
    title: 'Log a set in two taps',
    subtitle: 'The fastest workout logger ever built.',
  },
  {
    Icon: IconWifiOff,
    title: 'Works without signal',
    subtitle: 'No signal in the gym? No problem.',
  },
  {
    Icon: IconShieldCheck,
    title: 'Your data stays yours',
    subtitle: 'Private by default. Always.',
  },
] as const;

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-6 justify-center">
        {/* App icon */}
        <View className="w-14 h-14 rounded-2xl bg-hero items-center justify-center mb-6">
          <IconBarbell size={28} color={Colors.primary} />
        </View>

        {/* Wordmark */}
        <Text className="text-accent text-display mb-2">Pulse</Text>
        <Text className="text-primary text-title mb-8">
          Train with intent.
        </Text>

        {/* Feature bullets */}
        <View className="mb-10">
          {FEATURES.map((feature, index) => (
            <View
              key={feature.title}
              className={`flex-row items-center ${index < FEATURES.length - 1 ? 'mb-4' : ''}`}
            >
              <View className="w-8 h-8 rounded-full bg-stat-tile items-center justify-center mr-3">
                <feature.Icon size={16} color={Colors.label} />
              </View>
              <View className="flex-1">
                <Text className="text-primary text-subtitle">{feature.title}</Text>
                <Text className="text-ambient text-body-sm">{feature.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <Link href="/(auth)/sign-up" asChild>
          <Pressable
            className="bg-accent rounded-btn min-h-btn items-center justify-center mb-3"
            accessibilityRole="button"
            accessibilityLabel="Get started — create an account"
          >
            <Text className="text-accent-text text-subtitle">Get started</Text>
          </Pressable>
        </Link>

        <Link href="/(auth)/sign-in" asChild>
          <Pressable
            className="rounded-btn min-h-btn items-center justify-center border border-border-subtle"
            accessibilityRole="button"
            accessibilityLabel="I already have an account — sign in"
          >
            <Text className="text-label text-subtitle">I already have an account</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
