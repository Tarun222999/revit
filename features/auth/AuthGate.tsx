import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const lastRedirectKeyRef = useRef<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const profileQuery = useCurrentProfile(user?.id);

  const isWelcomeRoute = pathname === '/welcome';
  const isEmailCodeRoute = pathname === '/email-code';
  const isCallbackRoute = pathname === '/callback';
  const isOnboardingRoute = pathname === '/onboarding';
  const isPublicInfoRoute =
    pathname === '/legal/privacy' ||
    pathname === '/legal/terms' ||
    pathname === '/legal/credits' ||
    pathname === '/support';
  const isAuthRoute = isWelcomeRoute || isEmailCodeRoute || isCallbackRoute || isOnboardingRoute;

  const redirectTarget = useMemo(() => {
    if (authLoading || (user && profileQuery.isLoading && !isCallbackRoute)) {
      return null;
    }

    if (!user) {
      return !isAuthRoute && !isPublicInfoRoute ? '/welcome' : null;
    }

    if (isCallbackRoute) {
      return null;
    }

    if (!profileQuery.data) {
      return !isOnboardingRoute ? '/onboarding' : null;
    }

    return isAuthRoute ? '/(tabs)' : null;
  }, [
    authLoading,
    isAuthRoute,
    isCallbackRoute,
    isOnboardingRoute,
    isPublicInfoRoute,
    profileQuery.data,
    profileQuery.isLoading,
    user,
  ]);

  useEffect(() => {
    if (!redirectTarget) {
      lastRedirectKeyRef.current = null;
      return;
    }

    const redirectKey = `${pathname}->${redirectTarget}`;

    if (lastRedirectKeyRef.current === redirectKey) {
      return;
    }

    lastRedirectKeyRef.current = redirectKey;
    router.replace(redirectTarget);
  }, [pathname, redirectTarget]);

  const isResolvingAuthRoute =
    authLoading ||
    Boolean(user && profileQuery.isLoading && !isCallbackRoute) ||
    Boolean(user && profileQuery.data && isAuthRoute) ||
    Boolean(!user && !authLoading && !isAuthRoute && !isPublicInfoRoute) ||
    Boolean(user && !profileQuery.data && !profileQuery.isLoading && !isOnboardingRoute);

  return (
    <View style={styles.container}>
      {children}
      {isResolvingAuthRoute ? (
        <View className="items-center justify-center bg-archive-900" style={StyleSheet.absoluteFill}>
          <ActivityIndicator color="#d7a94d" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
