import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { getProfileAvatarUrl } from '@/features/profile/api/profile-api';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';

export function ProfileAvatarAction() {
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile(user?.id);
  const fallback = profile?.display_name?.[0] ?? profile?.username?.[0] ?? user?.email?.[0] ?? 'R';
  const avatarUrl = getProfileAvatarUrl(profile?.avatar_path, profile?.updated_at);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      className="mr-4 h-9 w-9 overflow-hidden rounded-full border border-gold-400 bg-archive-800"
      onPress={() => router.push('/profile')}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          contentFit="cover"
          style={{ height: '100%', width: '100%' }}
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Text className="text-sm font-bold text-gold-300">{fallback.toUpperCase()}</Text>
        </View>
      )}
    </Pressable>
  );
}
