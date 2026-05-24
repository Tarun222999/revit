import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { isAppleSignInAvailable, signInWithApple } from '@/features/auth/api/apple-auth-api';
import { signInWithGoogle } from '@/features/auth/api/google-auth-api';

export function WelcomeAuthScreen() {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  async function handleGoogleSignIn() {
    setError(null);
    setLoadingProvider('google');

    try {
      await signInWithGoogle();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in failed.');
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleAppleSignIn() {
    setError(null);
    setLoadingProvider('apple');

    try {
      await signInWithApple();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Apple sign-in failed.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-between gap-8">
        <View className="gap-6 pt-10">
          <View className="h-20 w-20 items-center justify-center rounded-app border border-gold-300 bg-gold-400">
            <Text className="text-4xl font-bold text-archive-900">R</Text>
          </View>
          <View className="gap-3">
            <Text className="text-4xl font-bold text-archive-50">Revit</Text>
            <Text className="text-lg leading-7 text-archive-200">
              Your personal entertainment journal for movies, series, anime, and games.
            </Text>
          </View>
        </View>

        <Card className="gap-4">
          <View className="gap-2">
            <Text className="text-lg font-semibold text-archive-50">Start your shelf</Text>
            <Text className="text-sm leading-5 text-archive-300">
              Sign in to track what you watch, play, rate, and remember.
            </Text>
          </View>

          <View className="gap-3">
            <Button title="Continue with Email" onPress={() => router.push('/email-code')} />
            <Button
              title="Continue with Google"
              variant="secondary"
              onPress={handleGoogleSignIn}
              loading={loadingProvider === 'google'}
            />
            {Platform.OS === 'ios' && appleAvailable ? (
              <Button
                title="Continue with Apple"
                variant="secondary"
                onPress={handleAppleSignIn}
                loading={loadingProvider === 'apple'}
              />
            ) : null}
          </View>

          {error ? <Text className="text-sm leading-5 text-reel-400">{error}</Text> : null}

        </Card>

        <Text className="text-center text-xs leading-5 text-archive-300">
          By continuing, you agree to Revit&apos;s Terms and Privacy Policy.
        </Text>
      </View>
    </Screen>
  );
}
