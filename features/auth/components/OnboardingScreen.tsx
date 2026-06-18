import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { normalizeUsername, validateDisplayName, validateUsername } from '@/features/profile/api/profile-api';
import { useCreateProfile } from '@/features/profile/hooks/useCreateProfile';
import { cn } from '@/lib/utils/cn';

const INTEREST_OPTIONS = ['Movies', 'Series', 'Anime'];

export function OnboardingScreen() {
  const { user } = useAuth();
  const createProfile = useCreateProfile();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const displayNameError = displayName ? validateDisplayName(displayName) ?? undefined : undefined;
  const usernameError = username ? validateUsername(username) ?? undefined : undefined;
  const avatarInitial = (displayName.trim()[0] ?? username.trim()[0] ?? 'R').toUpperCase();

  function toggleInterest(interest: string) {
    setSelectedInterests((currentInterests) =>
      currentInterests.includes(interest)
        ? currentInterests.filter((currentInterest) => currentInterest !== interest)
        : [...currentInterests, interest],
    );
  }

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
      router.replace('/(tabs)');
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
      <View className="gap-6">
        <View className="gap-3 pt-4">
          <Text className="text-sm font-semibold uppercase text-gold-300">
            One last step
          </Text>
          <Text className="text-3xl font-bold text-archive-50">
            Set up your profile
          </Text>
          <Text className="text-base leading-6 text-archive-200">
            Pick the name attached to your journal. You can update your avatar and details later.
          </Text>
        </View>

        <Card className="gap-5">
          <View className="flex-row items-center gap-4">
            <View className="h-20 w-20 items-center justify-center rounded-full border border-gold-400 bg-archive-700">
              <Text className="text-2xl font-bold text-gold-300">
                {avatarInitial}
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-lg font-bold text-archive-50">
                {displayName.trim() || 'Your journal identity'}
              </Text>
              <Text className="text-sm leading-5 text-archive-300">
                @{normalizedUsername || 'username'}
              </Text>
            </View>
          </View>

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

          <View className="gap-2">
            <Text className="text-sm leading-5 text-archive-300">
              Usernames use 3-24 lowercase letters, numbers, or underscores.
            </Text>
            {normalizedUsername && normalizedUsername !== username ? (
              <Text className="text-sm leading-5 text-gold-300">
                This will be saved as @{normalizedUsername}.
              </Text>
            ) : null}
          </View>

          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-sm font-semibold text-archive-100">
                Interests
              </Text>
              <Text className="text-sm leading-5 text-archive-300">
                Optional for now, useful later for discovery tuning.
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = selectedInterests.includes(interest);

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    className={cn(
                      'min-h-10 items-center justify-center rounded-app border px-4',
                      selected
                        ? 'border-gold-400 bg-gold-400'
                        : 'border-archive-500 bg-archive-800',
                    )}>
                    <Text
                      className={cn(
                        'text-sm font-semibold',
                        selected ? 'text-archive-900' : 'text-archive-100',
                      )}>
                      {interest}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <Text className="text-sm leading-5 text-reel-400">{error}</Text> : null}

          <Button
            title="Continue"
            onPress={handleContinue}
            loading={createProfile.isPending}
          />
        </Card>
      </View>
    </Screen>
  );
}
