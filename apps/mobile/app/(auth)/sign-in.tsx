import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const AUTH_OPTIONS: { title: string; icon: string; subtitle: string }[] = [
  { title: 'Passkey', icon: '\u{1F511}', subtitle: 'Sign in with Face ID or fingerprint' },
  { title: 'Apple', icon: '\u{F8FF}', subtitle: 'Continue with Apple' },
  { title: 'Google', icon: 'G', subtitle: 'Continue with Google' },
  { title: 'Email', icon: '\u{2709}', subtitle: 'Send a magic link to your inbox' },
];

export default function SignInScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 px-6 pt-8">
        <Pressable onPress={() => router.back()} className="mb-6">
          <Text className="text-label text-body-sm">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="text-label text-label-xs uppercase tracking-widest mb-1">
          Screen 7
        </Text>
        <Text className="text-primary text-title mb-2">
          Welcome back
        </Text>
        <Text className="text-ambient text-body-sm mb-8">
          Choose how you'd like to sign in.
        </Text>

        {/* Auth option cards */}
        {AUTH_OPTIONS.map((option) => (
          <Pressable
            key={option.title}
            className="bg-card rounded-card p-card-pad mb-card-gap flex-row items-center border border-border-subtle"
            onPress={() => {
              // TODO: Integrate Clerk auth methods
            }}
          >
            <View className="w-10 h-10 rounded-full bg-stat-tile items-center justify-center mr-3">
              <Text className="text-label text-subtitle">{option.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-primary text-subtitle">{option.title}</Text>
              <Text className="text-ambient text-body-sm">{option.subtitle}</Text>
            </View>
          </Pressable>
        ))}

        {/* Send magic link button */}
        <View className="mt-auto mb-8">
          <Pressable className="bg-accent rounded-btn min-h-btn items-center justify-center">
            <Text className="text-accent-text text-subtitle">Send magic link</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
