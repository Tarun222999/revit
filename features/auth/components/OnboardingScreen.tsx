import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  normalizeUsername,
  uploadProfileAvatar,
  validateDisplayName,
  validateUsername,
} from '@/features/profile/api/profile-api';
import { useCreateProfile } from '@/features/profile/hooks/useCreateProfile';
import { getProfileErrorMessage } from '@/features/profile/utils/profileErrors';

function ProfileTextInput({
  autoCapitalize = 'none',
  editable,
  error,
  icon,
  label,
  onChangeText,
  placeholder,
  textContentType,
  value,
}: {
  autoCapitalize?: 'none' | 'words';
  editable: boolean;
  error?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  textContentType?: 'name';
  value: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-base font-bold text-archive-50">{label}</Text>
      <View className="min-h-14 flex-row items-center gap-3 rounded-app border border-gold-500 bg-archive-700 px-4">
        <MaterialIcons name={icon} size={24} color={icon === 'alternate-email' ? '#d7a94d' : '#aa9473'} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
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

export function OnboardingScreen() {
  const { signOut, user } = useAuth();
  const createProfile = useCreateProfile();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const displayNameError = displayName ? validateDisplayName(displayName) ?? undefined : undefined;
  const usernameError = username ? validateUsername(username) ?? undefined : undefined;
  const avatarInitial = (displayName.trim()[0] ?? username.trim()[0] ?? 'R').toUpperCase();
  const isBusy = isSubmitting || createProfile.isPending;

  async function handlePickAvatar() {
    if (isBusy) {
      return;
    }

    setError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError('Allow photo library access before choosing an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) {
        setError('Choose an image before adding an avatar.');
        return;
      }

      setSelectedAvatar(asset);
    } catch (avatarError) {
      setError(getProfileErrorMessage(avatarError, 'Could not choose avatar.'));
    }
  }

  async function handleContinue() {
    if (isBusy) {
      return;
    }

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
      setIsSubmitting(true);
      const avatarPath = selectedAvatar
        ? await uploadProfileAvatar({
            base64: selectedAvatar.base64,
            file: selectedAvatar.file ?? null,
            fileName: selectedAvatar.fileName,
            mimeType: selectedAvatar.mimeType,
            uri: selectedAvatar.uri,
            userId: user.id,
          })
        : null;

      await createProfile.mutateAsync({
        avatarPath,
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
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (isBusy) {
      return;
    }

    setError(null);

    try {
      await signOut();
      router.replace('/welcome');
    } catch (signOutError) {
      setError(getProfileErrorMessage(signOutError, 'Could not sign out.'));
    }
  }

  return (
    <Screen scroll className="flex-grow justify-center gap-8">
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-sm font-bold uppercase text-gold-400">
            One last step
          </Text>
          <Text className="text-3xl font-bold text-archive-50">
            Set up your profile
          </Text>
          <Text className="text-base leading-6 text-archive-300">
            Pick the name attached to your journal.
          </Text>
        </View>

        <Card className="gap-5 border-gold-500 bg-archive-800 p-5">
          <View className="flex-row items-center gap-4">
            <View className="relative h-20 w-20">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose optional profile avatar"
                disabled={isBusy}
                onPress={handlePickAvatar}
                className="h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-gold-400 bg-gold-500/20">
                {selectedAvatar ? (
                  <Image
                    source={{ uri: selectedAvatar.uri }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Text className="text-3xl font-bold text-gold-400">{avatarInitial}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose optional profile avatar"
                disabled={isBusy}
                onPress={handlePickAvatar}
                className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-4 border-archive-800 bg-gold-400">
                <MaterialIcons
                  name={selectedAvatar ? 'edit' : 'add-a-photo'}
                  size={18}
                  color="#fbf6ec"
                />
              </Pressable>
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-lg font-bold text-archive-50">
                {displayName.trim() || 'Your journal identity'}
              </Text>
              <Text className="text-sm leading-5 text-gold-500">
                @{normalizedUsername || 'username'}
              </Text>
            </View>
          </View>

          <ProfileTextInput
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            autoCapitalize="words"
            textContentType="name"
            icon="person-outline"
            error={displayNameError}
            editable={!isBusy}
          />

          <ProfileTextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="revit_reader"
            icon="alternate-email"
            error={usernameError}
            editable={!isBusy}
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
            <Text className="text-sm leading-5 text-archive-300">
              Avatar is optional and can be changed later from Profile.
            </Text>
          </View>

          {error ? (
            <View className="rounded-app border border-reel-400 bg-reel-500 px-4 py-3">
              <Text className="text-sm font-semibold leading-5 text-archive-50">{error}</Text>
            </View>
          ) : null}

          <Button
            title="Continue"
            className="mt-4 min-h-14"
            onPress={handleContinue}
            loading={isBusy}
          />
          <Button
            title="Use a different account"
            variant="secondary"
            disabled={isBusy}
            onPress={handleSignOut}
          />
        </Card>
      </View>
    </Screen>
  );
}
