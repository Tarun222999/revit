import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { getAuthRedirectUrl } from '@/features/auth/utils/authRedirect';

export function HomeScreen() {
  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Card className="gap-4">
          <SectionHeader
            title="Home"
            subtitle={`Phase 3 will split this screen into Discover and Dashboard sections.\n\nTemporary auth redirect URL:\n${getAuthRedirectUrl()}`}
          />
          <Button title="Test Email Auth" onPress={() => router.push('/email-code')} />
        </Card>
        <View className="h-1 w-16 rounded-full bg-gold-400" />
      </View>
    </Screen>
  );
}
