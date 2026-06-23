import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { sendEmailOtp, verifyEmailOtp } from '@/features/auth/api/email-auth-api';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getEmailAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid')) {
    return 'That code is invalid or expired. Request a new code and try again.';
  }

  return message || 'Could not complete email sign-in.';
}

function AuthTextInput({
  editable,
  error,
  icon,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  textContentType,
  value,
}: {
  editable: boolean;
  error?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  keyboardType?: 'email-address' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  textContentType?: 'emailAddress' | 'oneTimeCode';
  value: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-archive-50">{label}</Text>
      <View className="min-h-14 flex-row items-center gap-3 rounded-app border border-gold-500 bg-archive-900 px-4">
        <MaterialIcons name={icon} size={22} color="#b9842e" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType}
          textContentType={textContentType}
          placeholder={placeholder}
          placeholderTextColor="#aa9473"
          editable={editable}
          className="min-w-0 flex-1 text-base text-archive-50"
        />
      </View>
      {error ? <Text className="text-sm leading-5 text-reel-400">{error}</Text> : null}
    </View>
  );
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
      setNotice('Check your email for a one-time code.');
    } catch (sendError) {
      setError(getEmailAuthErrorMessage(sendError));
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
      setError(getEmailAuthErrorMessage(verifyError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll className="flex-grow gap-6" safeAreaEdges={['top', 'right', 'bottom', 'left']}>
      <View className="pt-2">
        <Pressable
          accessibilityRole="button"
          className="min-h-11 flex-row items-center self-start"
          onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={34} color="#d7a94d" />
          <Text className="text-base font-semibold text-gold-400">
            Back
          </Text>
        </Pressable>
      </View>

      <View className="flex-1 justify-center gap-8">
        <View className="items-center gap-5">
          <View className="h-16 w-16 items-center justify-center rounded-full border border-gold-500 bg-archive-900 shadow-lg shadow-gold-500">
            <MaterialIcons name="mail-outline" size={32} color="#d7a94d" />
          </View>

          <View className="items-center gap-3">
            <Text className="text-center text-xs font-bold uppercase text-gold-400">
              Sign in
            </Text>
            <Text className="text-center text-3xl font-bold text-archive-50">
              Continue with Email
            </Text>
            <Text className="max-w-sm text-center text-base leading-6 text-archive-300">
              Get a one-time code for your Revit account.
            </Text>
          </View>
        </View>

        <Card className="gap-5 border-gold-500 bg-archive-800 p-5">
          <View className="gap-2">
            <Text className="text-xl font-bold text-archive-50">
              {sent ? 'Check your inbox' : 'Where should we send it?'}
            </Text>
            <Text className="text-base leading-6 text-archive-300">
              {sent
                ? `We sent a sign-in email to ${email.trim()}.`
                : 'Use the email address you want attached to your journal.'}
            </Text>
          </View>

          <View className="gap-4">
            <AuthTextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              error={emailError}
              icon="mail-outline"
              editable={!loading && !sent}
            />

            {sent ? (
              <AuthTextInput
                label="Code"
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                placeholder="123456"
                icon="password"
                editable={!loading}
              />
            ) : null}

            {notice ? (
              <View className="rounded-app border border-teal-500 bg-archive-900 px-4 py-3">
                <Text className="text-sm leading-5 text-teal-300">
                  {notice}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View className="rounded-app border border-reel-400 bg-reel-500 px-4 py-3">
                <Text className="text-sm font-semibold leading-5 text-archive-50">
                  {error}
                </Text>
              </View>
            ) : null}

            {sent ? (
              <View className="gap-3">
                <Button title="Verify Code" className="min-h-14" onPress={handleVerifyCode} loading={loading} />
                <Button title="Resend Code" variant="ghost" onPress={handleSendCode} disabled={loading} />
              </View>
            ) : (
              <Button title="Send Code" className="min-h-14" onPress={handleSendCode} loading={loading} />
            )}
          </View>
        </Card>

        <View className="flex-row items-center justify-center gap-3 px-5">
          <MaterialIcons name="lock-outline" size={20} color="#e8c77d" />
          <Text className="min-w-0 flex-1 text-center text-sm leading-5 text-gold-300">
            No password needed. Email codes keep your account simple and secure.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
