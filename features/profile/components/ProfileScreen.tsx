import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineNotice } from '@/components/feedback/InlineNotice';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getProfileAvatarUrl } from '@/features/profile/api/profile-api';
import { ProfileAccountRow } from '@/features/profile/components/ProfileAccountRow';
import { ProfileEditForm } from '@/features/profile/components/ProfileEditForm';
import { ProfileIdentityHeader } from '@/features/profile/components/ProfileIdentityHeader';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';
import { useDeleteAccount } from '@/features/profile/hooks/useDeleteAccount';
import { useUpdateProfileAvatar } from '@/features/profile/hooks/useUpdateProfileAvatar';
import { getProfileErrorMessage } from '@/features/profile/utils/profileErrors';

function ConnectedAccountSection({ email }: { email?: string }) {
  return (
    <View className="gap-3">
      <SectionHeader title="Connected Account" />
      <ProfileAccountRow
        title="Email"
        description={email ?? 'No email address is attached to this session.'}
      />
    </View>
  );
}

function LegalSection() {
  return (
    <View className="gap-3">
      <SectionHeader title="Legal And Support" />
      <ProfileAccountRow
        title="Privacy Policy"
        onPress={() => router.push('/legal/privacy')}
      />
      <ProfileAccountRow
        title="Terms of Use"
        onPress={() => router.push('/legal/terms')}
      />
      <ProfileAccountRow
        title="Credits / Attributions"
        onPress={() => router.push('/legal/credits')}
      />
      <ProfileAccountRow title="Support" onPress={() => router.push('/support')} />
    </View>
  );
}

function DangerSection({
  deleting,
  error,
  onDeleteAccount,
  onSignOut,
}: {
  deleting: boolean;
  error: string | null;
  onDeleteAccount: () => void;
  onSignOut: () => void;
}) {
  return (
    <View className="gap-3">
      <SectionHeader title="Account" />
      {error ? <InlineNotice tone="error" message={error} /> : null}
      <Button
        disabled={deleting}
        title="Sign Out"
        variant="secondary"
        onPress={onSignOut}
      />
      <ProfileAccountRow
        title="Delete Account"
        description={
          deleting
            ? 'Deleting your account...'
            : 'Permanently remove your profile, journal, lists, and avatar.'
        }
        tone="danger"
        disabled={deleting}
        onPress={onDeleteAccount}
      />
    </View>
  );
}

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const profileQuery = useCurrentProfile(user?.id);
  const deleteAccount = useDeleteAccount();
  const updateAvatar = useUpdateProfileAvatar();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  async function handleUpdateAvatar() {
    if (!user) {
      return;
    }

    setAvatarError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setAvatarError('Allow photo library access before updating your avatar.');
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
        setAvatarError('Choose an image before updating your avatar.');
        return;
      }

      await updateAvatar.mutateAsync({
        base64: asset.base64,
        file: asset.file ?? null,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        uri: asset.uri,
        userId: user.id,
      });
    } catch (error) {
      setAvatarError(getProfileErrorMessage(error, 'Could not update avatar.'));
    }
  }

  async function handleSignOut() {
    setAccountError(null);

    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (error) {
      setAccountError(getProfileErrorMessage(error, 'Could not sign out.'));
    }
  }

  function handleDeleteAccount() {
    setAccountError(null);

    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, journal entries, lists, and avatar. This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
              router.replace('/(auth)/welcome');
            } catch (error) {
              setAccountError(
                getProfileErrorMessage(error, 'Could not delete account.'),
              );
            }
          },
        },
      ],
    );
  }

  if (!user) {
    return (
      <Screen className="justify-center">
        <ErrorState
          title="Sign in required"
          message="Sign in before opening your account settings."
        />
      </Screen>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <Screen className="justify-center">
        <LoadingState message="Loading profile" />
      </Screen>
    );
  }

  if (profileQuery.isError) {
    return (
      <Screen className="justify-center">
        <ErrorState
          title="Unable to load profile"
          message={getProfileErrorMessage(
            profileQuery.error,
            'Your account details are unavailable right now.',
          )}
          retryLabel="Reload profile"
          onRetry={() => profileQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!profileQuery.data) {
    return (
      <Screen className="justify-center">
        <ErrorState
          title="Profile not found"
          message="Finish onboarding before managing your account."
        />
      </Screen>
    );
  }

  const avatarUrl = getProfileAvatarUrl(
    profileQuery.data.avatar_path,
    profileQuery.data.updated_at,
  );

  return (
    <Screen scroll>
      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-archive-50">Profile</Text>
          <Text className="text-base leading-6 text-archive-300">
            Manage the identity and account details tied to your journal.
          </Text>
        </View>

        <ProfileIdentityHeader
          avatarLoading={updateAvatar.isPending}
          avatarUrl={avatarUrl}
          email={user.email}
          isEditing={isEditing}
          profile={profileQuery.data}
          onEdit={() => setIsEditing(true)}
          onUpdateAvatar={handleUpdateAvatar}
        />

        {avatarError ? <InlineNotice tone="error" message={avatarError} /> : null}

        {isEditing ? (
          <ProfileEditForm
            initialProfile={profileQuery.data}
            userId={user.id}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        ) : null}

        <ConnectedAccountSection email={user.email} />
        <LegalSection />
        <DangerSection
          deleting={deleteAccount.isPending}
          error={accountError}
          onDeleteAccount={handleDeleteAccount}
          onSignOut={handleSignOut}
        />
      </View>
    </Screen>
  );
}
