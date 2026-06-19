import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { sendEmailOtp, verifyEmailOtp } from '@/features/auth/api/email-auth-api';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function EmailCodeScreen() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailError = email && !isValidEmail(email) ? 'Enter a valid email address.' : undefined;

  async function handleSendCode() {
    setError(null);
    setNotice(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await sendEmailOtp(email);
      setSent(true);
      setNotice('Check your email for a sign-in code or magic link.');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the sign-in email.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);

    if (!token.trim()) {
      setError('Enter the code from your email.');
      return;
    }

    setLoading(true);

    try {
      await verifyEmailOtp(email, token);
      router.replace('/(auth)/onboarding');
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify that code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <View className="gap-6">
        <View className="gap-5 pt-4">
          <Pressable
            accessibilityRole="button"
            className="min-h-10 self-start justify-center"
            onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-gold-300">
              Back
            </Text>
          </Pressable>

          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase text-gold-300">
              Sign in
            </Text>
            <Text className="text-3xl font-bold text-archive-50">
              Continue with Email
            </Text>
            <Text className="text-base leading-6 text-archive-200">
              Get a one-time code or magic link for your Revit account.
            </Text>
          </View>
        </View>

        <Card className="gap-5">
          <View className="gap-2">
            <Text className="text-lg font-bold text-archive-50">
              {sent ? 'Check your inbox' : 'Where should we send it?'}
            </Text>
            <Text className="text-sm leading-5 text-archive-300">
              {sent
                ? `We sent a sign-in email to ${email.trim()}.`
                : 'Use the email address you want attached to your journal.'}
            </Text>
          </View>

          <View className="gap-4">
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              error={emailError}
              editable={!loading && !sent}
            />

            {sent ? (
              <TextField
                label="Code"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                placeholder="123456"
                editable={!loading}
              />
            ) : null}

            {notice ? (
              <View className="rounded-app border border-teal-700 bg-teal-950/40 px-4 py-3">
                <Text className="text-sm leading-5 text-teal-200">
                  {notice}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View className="rounded-app border border-reel-500 bg-reel-950/30 px-4 py-3">
                <Text className="text-sm leading-5 text-reel-300">
                  {error}
                </Text>
              </View>
            ) : null}

            {sent ? (
              <View className="gap-3">
                <Button title="Verify Code" onPress={handleVerifyCode} loading={loading} />
                <Button title="Resend Code" variant="ghost" onPress={handleSendCode} disabled={loading} />
              </View>
            ) : (
              <Button title="Send Code" onPress={handleSendCode} loading={loading} />
            )}
          </View>
        </Card>

        <Text className="text-center text-xs leading-5 text-archive-400">
          No password needed. Email sign-in keeps your account simple and secure.
        </Text>
      </View>
    </Screen>
  );
}
