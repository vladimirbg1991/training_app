import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
// NOTE: import from '@clerk/expo/legacy'. In @clerk/expo 3.2.16 the default
// `useSignIn` resolves to the new signals API (useClerkSignal), whose value has
// no `isLoaded`/`setActive` and whose resource lacks `create`/`prepareFirstFactor`/
// `attemptFirstFactor`. The classic resource API this screen uses lives behind
// the `/legacy` entry. (useUser/useAuth are unaffected and stay on the default.)
import { useSignIn } from '@clerk/expo/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';
import { getAuthErrorMessage } from '@/lib/auth/get-auth-error-message';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Passwordless email one-time-code sign-in.
 *
 * Flow (matches the Clerk instance, which enables only the `email_code`
 * first factor — no magic link, no passkey):
 *   1. signIn.create({ identifier })            → resolves the email factor
 *   2. prepareFirstFactor({ email_code })        → Clerk sends the 6-digit code
 *   3. attemptFirstFactor({ email_code, code })  → verify
 *   4. setActive({ session })                    → AuthGate routes onward
 *
 * Apple / Google OAuth is intentionally deferred (needs native config) and
 * is not rendered here yet.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pendingCode, setPendingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ── Step 1+2: send the code ────────────────────────────────────────────
  async function handleSendCode() {
    if (!isLoaded || !signIn) return;

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    clearError();
    setLoading(true);
    Keyboard.dismiss();

    try {
      const attempt = await signIn.create({ identifier: trimmed });

      const emailFactor = attempt.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code',
      );

      if (!emailFactor || emailFactor.strategy !== 'email_code') {
        setError('Email sign-in is not available for this account.');
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });

      setPendingCode(true);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3+4: verify the code ──────────────────────────────────────────
  async function handleVerifyCode() {
    if (!isLoaded || !signIn) return;
    if (!code.trim()) return;

    clearError();
    setLoading(true);
    Keyboard.dismiss();

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: code.trim(),
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        // AuthGate in _layout.tsx handles routing from here.
      } else {
        // Never silently stall — tell the user what happened.
        setError(`Could not finish sign-in (status: ${result.status ?? 'unknown'}).`);
      }
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setCode('');
    await handleSendCode();
  }

  // ── Code-entry view ────────────────────────────────────────────────────
  if (pendingCode) {
    return (
      <SafeAreaView className="flex-1 bg-page">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 px-6 pt-4">
              <Pressable
                onPress={() => {
                  setPendingCode(false);
                  setCode('');
                  clearError();
                }}
                hitSlop={12}
                className="min-h-tap min-w-[44px] justify-center self-start mb-6"
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <IconChevronLeft size={24} color={Colors.label} />
              </Pressable>

              <Text className="text-primary text-title mb-2">Enter your code</Text>
              <Text className="text-ambient text-body-sm mb-8">
                We sent a 6-digit code to {email.trim()}.
              </Text>

              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  if (error) clearError();
                }}
                placeholder="Enter code"
                placeholderTextColor={Colors.label}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!loading}
                className="bg-card border-[0.5px] border-border-subtle rounded-btn h-[52px] px-4 text-primary text-subtitle mb-3"
              />
              {error && (
                <Text className="text-coral text-body-sm -mt-1 mb-3 ml-1">{error}</Text>
              )}

              <Pressable
                onPress={handleVerifyCode}
                disabled={loading || !code.trim()}
                className="bg-accent rounded-btn min-h-btn items-center justify-center mb-4"
                accessibilityRole="button"
                accessibilityLabel="Verify code"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.accentText} />
                ) : (
                  <Text className="text-accent-text text-[14px] font-medium">Verify</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleResend}
                disabled={loading}
                className="items-center"
                accessibilityRole="button"
                accessibilityLabel="Resend code"
              >
                <Text className="text-label text-body-sm">
                  Didn&apos;t get it? <Text className="text-accent">Resend</Text>
                </Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Email-entry view ───────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6 pt-4">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="min-h-tap min-w-[44px] justify-center self-start mb-6"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <IconChevronLeft size={24} color={Colors.label} />
            </Pressable>

            <Text className="text-primary text-[26px] font-medium mb-1">
              Welcome back
            </Text>
            <Text className="text-ambient text-body-sm mb-8">
              Enter your email and we&apos;ll send you a sign-in code.
            </Text>

            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) clearError();
              }}
              placeholder="you@example.com"
              placeholderTextColor={Colors.borderSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              autoFocus
              editable={!loading}
              className="bg-card rounded-btn h-[52px] px-4 text-primary text-subtitle border-[0.5px] border-border-subtle mb-3"
            />
            {error && (
              <Text className="text-coral text-body-sm -mt-1 mb-3 ml-1">{error}</Text>
            )}

            <Pressable
              onPress={handleSendCode}
              disabled={loading || !email.trim()}
              className={`rounded-btn min-h-btn items-center justify-center ${
                email.trim() ? 'bg-accent' : 'bg-card border-[0.5px] border-border-subtle'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Continue with email"
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.accentText} />
              ) : (
                <Text
                  className={`text-subtitle ${email.trim() ? 'text-accent-text' : 'text-ambient'}`}
                >
                  Continue with email
                </Text>
              )}
            </Pressable>

            {/* Footer */}
            <View className="mt-auto mb-8 items-center">
              <Link href="/(auth)/sign-up" asChild>
                <Pressable
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Create an account"
                >
                  <Text className="text-ambient text-body-sm">
                    New here? <Text className="text-label">Create an account</Text>
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
