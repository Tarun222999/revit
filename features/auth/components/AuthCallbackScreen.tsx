import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { supabase } from '@/lib/supabase/client';

export function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    let mounted = true;

    async function finishCallback() {
      if (params.error_description) {
        setMessage(params.error_description);
        return;
      }

      if (!params.code) {
        setMessage('The sign-in link is missing a code. Please try again.');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(params.code);

      if (!mounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace('/onboarding');
    }

    finishCallback();

    return () => {
      mounted = false;
    };
  }, [params.code, params.error_description]);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator color="#d7a94d" />
        <Text className="text-center text-base text-archive-100">{message}</Text>
      </View>
    </Screen>
  );
}
