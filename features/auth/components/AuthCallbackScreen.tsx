import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';

export function AuthCallbackScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator color="#d7a94d" />
        <Text className="text-center text-base text-archive-100">Finishing sign in...</Text>
      </View>
    </Screen>
  );
}
