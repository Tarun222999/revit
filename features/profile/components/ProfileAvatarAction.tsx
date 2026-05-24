import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';

export function ProfileAvatarAction() {
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile(user?.id);
  const fallback = profile?.display_name?.[0] ?? profile?.username?.[0] ?? user?.email?.[0] ?? 'R';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      className="mr-4 h-9 w-9 items-center justify-center rounded-full border border-gold-400 bg-archive-800"
      onPress={() => router.push('/profile')}>
      <Text className="text-sm font-bold text-gold-300">{fallback.toUpperCase()}</Text>
    </Pressable>
  );
}
