import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSignIn, useSSO } from '@clerk/expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import {
  IconChevronLeft,
  IconFingerprint,
  IconBrandApple,
  IconBrandGoogle,
} from '@tabler/icons-react-native';
import { Colors } from '@/constants/colors';
import { getAuthErrorMessage } from '@/lib/auth/get-auth-error-message';

type AuthMethod = 'passkey' | 'apple' | 'google' | 'email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [loadingMethod, setLoadingMethod] = useState<AuthMethod | null>(null);
  const [error, setError] = useState<{ method: AuthMethod; message: string } | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  // ── Warm up web browser for OAuth flows ───────────────────────────────
  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  // ── SSO (Apple / Google) ──────────────────────────────────────────────
  async function handleSSO(provider: 'oauth_apple' | 'oauth_google', method: AuthMethod) {
    clearError();
    setLoadingMethod(method);

    try {
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy: provider,
      });

      if (createdSessionId && ssoSetActive) {
        await ssoSetActive({ session: createdSessionId });
        // AuthGate in _layout.tsx handles routing
      }
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err);
      setError({ method, message });
    } finally {
      setLoadingMethod(null);
    }
  }

  // ── Passkey ───────────────────────────────────────────────────────────
  async function handlePasskey() {
    if (!isSignInLoaded || !signIn) return;
    clearError();
    setLoadingMethod('passkey');

    try {
      const result = await signIn.create({ strategy: 'passkey' });

      if (result.status === 'complete' && setActive) {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err);
      setError({ method: 'passkey', message });
    } finally {
      setLoadingMethod(null);
    }
  }

  // ── Email magic link ──────────────────────────────────────────────────
  async function handleEmailMagicLink() {
    if (!isSignInLoaded || !signIn) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setError({ method: 'email', message: 'Please enter your email address.' });
      return;
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      setError({ method: 'email', message: 'Please enter a valid email address.' });
      return;
    }

    clearError();
    setLoadingMethod('email');
    Keyboard.dismiss();

    try {
      const si = await signIn.create({ identifier: trimmed });

      const emailLinkFactor = si.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_link',
      );

      if (!emailLinkFactor || emailLinkFactor.strategy !== 'email_link') {
        setError({
          method: 'email',
          message: 'Magic link sign-in is not available for this account.',
        });
        return;
      }

      await si.prepareFirstFactor({
        strategy: 'email_link',
        emailAddressId: emailLinkFactor.emailAddressId,
        redirectUrl: 'gymapp://sign-in/verify',
      });

      setMagicLinkSent(true);
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err);
      setError({ method: 'email', message });
    } finally {
      setLoadingMethod(null);
    }
  }

  const isLoading = loadingMethod !== null;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 px-6 pt-4">
            {/* Header */}
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
              Sign in to pick up where you left off.
            </Text>

            {/* ── Auth options ────────────────────────────────────────── */}

            {/* Passkey */}
            <Pressable
              onPress={handlePasskey}
              disabled={isLoading}
              className="flex-row items-center rounded-card p-card-pad mb-card-gap bg-card border-[1.5px] border-border-active"
              accessibilityRole="button"
              accessibilityLabel="Sign in with passkey"
            >
              <View className="w-10 h-10 rounded-lg bg-stat-tile items-center justify-center mr-3">
                <IconFingerprint size={22} color={Colors.label} />
              </View>
              <Text className="flex-1 text-primary text-subtitle">Sign in with passkey</Text>
              {loadingMethod === 'passkey' && (
                <ActivityIndicator size="small" color={Colors.label} />
              )}
            </Pressable>
            {error?.method === 'passkey' && (
              <Text className="text-coral text-body-sm -mt-1 mb-2 ml-1">{error.message}</Text>
            )}

            {/* Apple */}
            <Pressable
              onPress={() => handleSSO('oauth_apple', 'apple')}
              disabled={isLoading}
              className="flex-row items-center rounded-card p-card-pad mb-card-gap border-[0.5px] border-border-subtle"
              style={{ backgroundColor: Colors.primary }}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
            >
              <View className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: Colors.accentText }}
              >
                <IconBrandApple size={22} color={Colors.primary} />
              </View>
              <Text className="flex-1 text-subtitle" style={{ color: Colors.accentText }}>
                Continue with Apple
              </Text>
              {loadingMethod === 'apple' && (
                <ActivityIndicator size="small" color={Colors.accentText} />
              )}
            </Pressable>
            {error?.method === 'apple' && (
              <Text className="text-coral text-body-sm -mt-1 mb-2 ml-1">{error.message}</Text>
            )}

            {/* Google */}
            <Pressable
              onPress={() => handleSSO('oauth_google', 'google')}
              disabled={isLoading}
              className="flex-row items-center rounded-card p-card-pad mb-card-gap bg-card border-[0.5px] border-border-subtle"
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <View className="w-10 h-10 rounded-lg bg-stat-tile items-center justify-center mr-3">
                <IconBrandGoogle size={22} color={Colors.label} />
              </View>
              <Text className="flex-1 text-primary text-subtitle">Continue with Google</Text>
              {loadingMethod === 'google' && (
                <ActivityIndicator size="small" color={Colors.label} />
              )}
            </Pressable>
            {error?.method === 'google' && (
              <Text className="text-coral text-body-sm -mt-1 mb-2 ml-1">{error.message}</Text>
            )}

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[0.5px] bg-border-subtle" />
              <Text className="text-ambient text-body-sm mx-3">or with email</Text>
              <View className="flex-1 h-[0.5px] bg-border-subtle" />
            </View>

            {/* Email input + magic link */}
            {magicLinkSent ? (
              <View className="bg-card rounded-card p-card-pad items-center">
                <Text className="text-primary text-subtitle mb-1">Check your inbox</Text>
                <Text className="text-ambient text-body-sm text-center">
                  We sent a magic link to {email.trim()}. Tap it to sign in.
                </Text>
                <Pressable
                  onPress={() => {
                    setMagicLinkSent(false);
                    clearError();
                  }}
                  className="mt-4"
                  accessibilityRole="button"
                  accessibilityLabel="Use a different method"
                >
                  <Text className="text-label text-body-sm">Use a different method</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error?.method === 'email') clearError();
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.borderSubtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!isLoading}
                  className="bg-card rounded-card p-card-pad text-primary text-subtitle border-[0.5px] border-border-subtle mb-3"
                />
                {error?.method === 'email' && (
                  <Text className="text-coral text-body-sm -mt-1 mb-2 ml-1">{error.message}</Text>
                )}

                <Pressable
                  onPress={handleEmailMagicLink}
                  disabled={isLoading || !email.trim()}
                  className={`rounded-btn min-h-btn items-center justify-center flex-row ${
                    email.trim() ? 'bg-accent' : 'bg-card border-[0.5px] border-border-subtle'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel="Send magic link"
                >
                  {loadingMethod === 'email' ? (
                    <ActivityIndicator size="small" color={Colors.accentText} />
                  ) : (
                    <Text
                      className={`text-subtitle ${
                        email.trim() ? 'text-accent-text' : 'text-ambient'
                      }`}
                    >
                      Send magic link
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            {/* Footer */}
            <View className="mt-auto mb-8 items-center">
              <Link href="/(auth)/sign-up" asChild>
                <Pressable
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Create an account"
                >
                  <Text className="text-ambient text-body-sm">
                    New here?{' '}
                    <Text className="text-label">Create an account</Text>
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
