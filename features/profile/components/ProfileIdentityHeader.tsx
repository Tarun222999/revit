import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Profile } from '@/features/profile/api/profile-api';

function getProfileInitial(profile: Profile, email?: string) {
  return (
    profile.display_name[0] ??
    profile.username[0] ??
    email?.[0] ??
    'R'
  ).toUpperCase();
}

type ProfileIdentityHeaderProps = {
  email?: string;
  isEditing: boolean;
  avatarUrl?: string | null;
  avatarLoading?: boolean;
  profile: Profile;
  onEdit: () => void;
  onUpdateAvatar: () => void;
};

export function ProfileIdentityHeader({
  avatarLoading = false,
  avatarUrl,
  email,
  isEditing,
  profile,
  onEdit,
  onUpdateAvatar,
}: ProfileIdentityHeaderProps) {
  return (
    <Card className="gap-5">
      <View className="flex-row items-center gap-4">
        <View className="h-20 w-20 overflow-hidden rounded-full border border-gold-400 bg-archive-700">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              contentFit="cover"
              style={{ height: '100%', width: '100%' }}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-2xl font-bold text-gold-300">
                {getProfileInitial(profile, email)}
              </Text>
            </View>
          )}
        </View>

        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-2xl font-bold text-archive-50">
            {profile.display_name}
          </Text>
          <Text className="text-base text-archive-300">@{profile.username}</Text>
          {email ? (
            <Text className="text-sm text-archive-400">{email}</Text>
          ) : null}
        </View>
      </View>

      {profile.bio ? (
        <Text className="text-sm leading-5 text-archive-200">{profile.bio}</Text>
      ) : null}

      <View className="flex-row gap-3">
        <Button
          title={isEditing ? 'Editing Profile' : 'Edit Profile'}
          className="flex-1"
          disabled={isEditing}
          onPress={onEdit}
        />
        <Button
          title="Update Avatar"
          variant="secondary"
          className="flex-1"
          loading={avatarLoading}
          onPress={onUpdateAvatar}
        />
      </View>
    </Card>
  );
}
