import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { sendEmailOtp, verifyEmailOtp } from '@/features/auth/api/email-auth-api';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';

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
      <View className="gap-8">
        <View className="gap-3">
          <Text className="text-3xl font-bold text-archive-50">Continue with Email</Text>
          <Text className="text-base leading-6 text-archive-200">
            We&apos;ll send a one-time sign-in code and magic link to your inbox.
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
            editable={!loading}
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

          {notice ? <Text className="text-sm leading-5 text-teal-300">{notice}</Text> : null}
          {error ? <Text className="text-sm leading-5 text-reel-400">{error}</Text> : null}

          {sent ? (
            <View className="gap-3">
              <Button title="Verify Code" onPress={handleVerifyCode} loading={loading} />
              <Button title="Resend Code" variant="ghost" onPress={handleSendCode} disabled={loading} />
            </View>
          ) : (
            <Button title="Send Code" onPress={handleSendCode} loading={loading} />
          )}
        </View>
      </View>
    </Screen>
  );
}
