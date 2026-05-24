import { Redirect, useSegments } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import type { PropsWithChildren } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';

function AuthLoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-archive-900 px-6">
      <ActivityIndicator color="#d7a94d" />
      <Text className="text-center text-sm text-archive-200">Opening your shelf...</Text>
    </View>
  );
}

export function AuthGate({ children }: PropsWithChildren) {
  const segments = useSegments();
  const { user, loading: authLoading } = useAuth();
  const profileQuery = useCurrentProfile(user?.id);

  const rootSegment = segments[0];
  const leafSegment = segments[segments.length - 1];
  const isAuthRoute = rootSegment === '(auth)';
  const isCallbackRoute = isAuthRoute && leafSegment === 'callback';
  const isOnboardingRoute = isAuthRoute && leafSegment === 'onboarding';

  if (authLoading || (user && profileQuery.isLoading && !isCallbackRoute)) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    if (isAuthRoute) {
      return <>{children}</>;
    }

    return <Redirect href="/(auth)/welcome" />;
  }

  if (isCallbackRoute) {
    return <>{children}</>;
  }

  if (!profileQuery.data) {
    if (isOnboardingRoute) {
      return <>{children}</>;
    }

    return <Redirect href="/(auth)/onboarding" />;
  }

  if (isAuthRoute) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <>{children}</>;
}
