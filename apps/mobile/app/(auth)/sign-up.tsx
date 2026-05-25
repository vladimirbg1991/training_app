import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';
import { getAuthErrorMessage } from '@/lib/auth/get-auth-error-message';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Warm up web browser for potential OAuth flows ─────────────────────
  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  async function handleSignUp() {
    if (!isLoaded || !email.trim()) return;

    if (!EMAIL_REGEX.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await signUp.create({ emailAddress: email.trim() });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(code: string) {
    if (!isLoaded || !code.trim()) return;
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace('/(auth)/user-type');
      }
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerification) {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 px-6 pt-8">
              <Pressable
                onPress={() => setPendingVerification(false)}
                hitSlop={8}
                className="min-h-tap min-w-[44px] justify-center self-start mb-6"
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <IconChevronLeft size={24} color={Colors.label} />
              </Pressable>

              <Text className="text-primary text-title mb-2">Check your email</Text>
              <Text className="text-ambient text-body-sm mb-8">
                We sent a verification code to {email}
              </Text>

              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Enter code"
                placeholderTextColor={Colors.label}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                className="bg-card border-[0.5px] border-border-subtle rounded-btn h-[52px] px-4 text-primary text-subtitle mb-4"
              />

              <Pressable
                onPress={() => handleVerify(verificationCode)}
                disabled={loading || !verificationCode.trim()}
                className="bg-accent rounded-btn min-h-btn items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Verify code"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.accentText} />
                ) : (
                  <Text className="text-accent-text text-[14px] font-medium">Verify</Text>
                )}
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6 pt-8">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="min-h-tap min-w-[44px] justify-center self-start mb-6"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <IconChevronLeft size={24} color={Colors.label} />
            </Pressable>

            <Text className="text-primary text-title mb-2">Create your account</Text>
            <Text className="text-ambient text-body-sm mb-8">
              Enter your email to get started.
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={Colors.label}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              className="bg-card border-[0.5px] border-border-subtle rounded-btn h-[52px] px-4 text-primary text-subtitle mb-4"
            />

            <Pressable
              onPress={handleSignUp}
              disabled={loading || !email.trim()}
              className="bg-accent rounded-btn min-h-btn items-center justify-center mb-4"
              accessibilityRole="button"
              accessibilityLabel="Continue with sign up"
            >
              {loading ? (
                <ActivityIndicator color={Colors.accentText} />
              ) : (
                <Text className="text-accent-text text-[14px] font-medium">Continue</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(auth)/sign-in')}
              className="items-center"
              accessibilityRole="button"
              accessibilityLabel="Go to sign in"
            >
              <Text className="text-label text-body-sm">
                Already have an account? <Text className="text-accent">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
