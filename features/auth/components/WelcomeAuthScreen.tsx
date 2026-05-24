import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';

export function WelcomeAuthScreen() {
  return (
    <Screen>
      <View className="flex-1 justify-between gap-8">
        <View className="gap-4 pt-10">
          <View className="h-16 w-16 items-center justify-center rounded-app bg-gold-400">
            <Text className="text-3xl font-bold text-archive-900">R</Text>
          </View>
          <View className="gap-3">
            <Text className="text-4xl font-bold text-archive-50">Revit</Text>
            <Text className="text-lg leading-7 text-archive-200">Your personal entertainment journal.</Text>
          </View>
        </View>

        <Card className="gap-3">
          <Button title="Continue with Email" onPress={() => router.push('/email-code')} />
        </Card>

        <Text className="text-center text-xs leading-5 text-archive-300">
          Google and Apple sign-in will be added after provider credentials are configured.
        </Text>
      </View>
    </Screen>
  );
}
