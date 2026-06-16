import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { InlineNotice } from '@/components/feedback/InlineNotice';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import {
  normalizeUsername,
  validateDisplayName,
  validateUsername,
  type Profile,
} from '@/features/profile/api/profile-api';
import { useUpdateProfile } from '@/features/profile/hooks/useUpdateProfile';
import {
  getProfileErrorMessage,
  isDuplicateProfileError,
} from '@/features/profile/utils/profileErrors';

type ProfileEditFormProps = {
  initialProfile: Profile;
  userId: string;
  onCancel: () => void;
  onSaved: () => void;
};

export function ProfileEditForm({
  initialProfile,
  userId,
  onCancel,
  onSaved,
}: ProfileEditFormProps) {
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [username, setUsername] = useState(initialProfile.username);
  const [bio, setBio] = useState(initialProfile.bio ?? '');
  const [error, setError] = useState<string | null>(null);

  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username],
  );
  const displayNameError = displayName
    ? validateDisplayName(displayName) ?? undefined
    : undefined;
  const usernameError = username
    ? validateUsername(username) ?? undefined
    : undefined;

  async function handleSave() {
    setError(null);

    const nextDisplayNameError = validateDisplayName(displayName);
    const nextUsernameError = validateUsername(username);

    if (nextDisplayNameError || nextUsernameError) {
      setError(nextDisplayNameError ?? nextUsernameError);
      return;
    }

    try {
      await updateProfile.mutateAsync({
        bio,
        displayName,
        userId,
        username: normalizedUsername,
      });
      onSaved();
    } catch (profileError) {
      if (isDuplicateProfileError(profileError)) {
        setError('That username is already taken.');
        return;
      }

      setError(
        getProfileErrorMessage(profileError, 'Could not update your profile.'),
      );
    }
  }

  return (
    <Card className="gap-4">
      <SectionHeader
        title="Edit Profile"
        subtitle="Keep your account identity simple and recognizable."
      />

      <TextField
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        autoCapitalize="words"
        textContentType="name"
        error={displayNameError}
        editable={!updateProfile.isPending}
      />

      <TextField
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="revit_reader"
        autoCapitalize="none"
        autoCorrect={false}
        error={usernameError}
        editable={!updateProfile.isPending}
      />

      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Optional"
        multiline
        className="min-h-24 py-3"
        editable={!updateProfile.isPending}
      />

      {error ? <InlineNotice tone="error" message={error} /> : null}

      <View className="flex-row gap-3">
        <Button
          title="Cancel"
          variant="secondary"
          className="flex-1"
          disabled={updateProfile.isPending}
          onPress={onCancel}
        />
        <Button
          title="Save"
          className="flex-1"
          loading={updateProfile.isPending}
          onPress={handleSave}
        />
      </View>
    </Card>
  );
}
