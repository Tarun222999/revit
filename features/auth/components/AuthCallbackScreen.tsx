import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { getCurrentProfile } from '@/features/profile/api/profile-api';
import { supabase } from '@/lib/supabase/client';

const handledAuthCodes = new Set<string>();

export function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [message, setMessage] = useState('Finishing sign in...');
  const handledCodeRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const errorDescription = Array.isArray(params.error_description)
      ? params.error_description[0]
      : params.error_description;

    async function finishCallback() {
      try {
        if (errorDescription) {
          setMessage(errorDescription);
          return;
        }

        if (!code) {
          setMessage('The sign-in link is missing a code. Please try again.');
          return;
        }

        if (handledCodeRef.current === code || handledAuthCodes.has(code)) {
          return;
        }

        handledCodeRef.current = code;
        handledAuthCodes.add(code);

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!mounted) {
          return;
        }

        if (error) {
          setMessage(error.message);
          return;
        }

        const userId = data.session?.user.id;

        if (!userId) {
          setMessage('Sign-in completed, but no user session was returned.');
          return;
        }

        const profile = await getCurrentProfile(userId);

        if (!mounted) {
          return;
        }

        router.replace(profile ? '/(tabs)' : '/(auth)/onboarding');
      } catch (callbackError) {
        if (!mounted) {
          return;
        }

        setMessage(callbackError instanceof Error ? callbackError.message : 'Could not finish sign in.');
      }
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
