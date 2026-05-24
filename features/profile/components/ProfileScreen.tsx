import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useCurrentProfile(user?.id);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);

    try {
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-5">
        <Card className="items-center gap-4">
          <View className="h-20 w-20 items-center justify-center rounded-full border border-gold-400 bg-archive-700">
            <Text className="text-2xl font-bold text-gold-300">
              {(profile?.display_name?.[0] ?? profile?.username?.[0] ?? user?.email?.[0] ?? 'R').toUpperCase()}
            </Text>
          </View>

          <View className="items-center gap-1">
            <Text className="text-2xl font-bold text-archive-50">
              {isLoading ? 'Loading profile...' : profile?.display_name}
            </Text>
            <Text className="text-base text-archive-300">
              {profile?.username ? `@${profile.username}` : user?.email}
            </Text>
          </View>
        </Card>

        {error ? <Text className="text-sm text-reel-400">{error}</Text> : null}

        <Button title="Sign Out" variant="secondary" onPress={handleSignOut} />
      </View>
    </Screen>
  );
}
