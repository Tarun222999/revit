import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { normalizeUsername, validateDisplayName, validateUsername } from '@/features/profile/api/profile-api';
import { useCreateProfile } from '@/features/profile/hooks/useCreateProfile';

export function OnboardingScreen() {
  const { user } = useAuth();
  const createProfile = useCreateProfile();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const displayNameError = displayName ? validateDisplayName(displayName) ?? undefined : undefined;
  const usernameError = username ? validateUsername(username) ?? undefined : undefined;

  async function handleContinue() {
    setError(null);

    if (!user) {
      setError('Sign in again before creating your profile.');
      return;
    }

    const nextDisplayNameError = validateDisplayName(displayName);
    const nextUsernameError = validateUsername(username);

    if (nextDisplayNameError || nextUsernameError) {
      setError(nextDisplayNameError ?? nextUsernameError);
      return;
    }

    try {
      await createProfile.mutateAsync({
        userId: user.id,
        displayName,
        username: normalizedUsername,
      });
      router.replace('/(tabs)/home');
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : 'Could not create your profile.';

      if (message.toLowerCase().includes('duplicate') || message.includes('23505')) {
        setError('That username is already taken.');
        return;
      }

      setError(message);
    }
  }

  return (
    <Screen scroll>
      <View className="gap-8">
        <View className="gap-3">
          <Text className="text-3xl font-bold text-archive-50">Set up your profile</Text>
          <Text className="text-base leading-6 text-archive-200">
            Create the identity that anchors your journal. You can polish the rest later.
          </Text>
        </View>

        <Card className="items-center gap-3">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-gold-400 bg-archive-700">
            <Text className="text-2xl font-bold text-gold-300">
              {(displayName.trim()[0] ?? username.trim()[0] ?? 'R').toUpperCase()}
            </Text>
          </View>
          <Text className="text-center text-sm text-archive-300">Avatar upload comes later; initials work for now.</Text>
        </Card>

        <View className="gap-4">
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            autoCapitalize="words"
            textContentType="name"
            error={displayNameError}
            editable={!createProfile.isPending}
          />

          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="revit_reader"
            autoCapitalize="none"
            autoCorrect={false}
            error={usernameError}
            editable={!createProfile.isPending}
          />

          <Text className="text-sm leading-5 text-archive-300">
            Use 3-24 lowercase letters, numbers, or underscores.
          </Text>

          {error ? <Text className="text-sm leading-5 text-reel-400">{error}</Text> : null}

          <Button title="Continue" onPress={handleContinue} loading={createProfile.isPending} />
        </View>
      </View>
    </Screen>
  );
}
