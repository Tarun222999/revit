import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';
import { useOnlineStatus } from '@/lib/query/network';
import {
  isRequestTimeoutError,
  STARTUP_REQUEST_TIMEOUT_MS,
} from '@/lib/query/requestTimeout';

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const lastRedirectKeyRef = useRef<string | null>(null);
  const wasOnlineRef = useRef(true);
  const [resolutionTimedOut, setResolutionTimedOut] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const {
    user,
    loading: authLoading,
    error: authError,
    retrySession,
  } = useAuth();
  const profileQuery = useCurrentProfile(user?.id);
  const refetchProfile = profileQuery.refetch;
  const isOnline = useOnlineStatus();

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
  const isProfileLoading = Boolean(
    user &&
      !isCallbackRoute &&
      (profileQuery.isLoading || (profileQuery.isPending && !profileQuery.isError)),
  );
  const isStartupLoading = authLoading || isProfileLoading;
  const hasStartupError = Boolean(
    authError ||
      profileQuery.isError ||
      resolutionTimedOut ||
      (!isOnline && isStartupLoading),
  );

  useEffect(() => {
    if (!isStartupLoading) {
      setResolutionTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setResolutionTimedOut(true);
    }, STARTUP_REQUEST_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [isStartupLoading]);

  const retryStartup = useCallback(async () => {
    setResolutionTimedOut(false);
    setIsRetrying(true);

    try {
      if (authLoading || authError || !user) {
        await retrySession();
      } else {
        await refetchProfile();
      }
    } catch (retryError: unknown) {
      console.warn('Unable to retry startup resolution.', retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [authError, authLoading, refetchProfile, retrySession, user]);

  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    if (!wasOnline && isOnline && hasStartupError && !isPublicInfoRoute && !isRetrying) {
      void retryStartup();
    }
  }, [hasStartupError, isOnline, isPublicInfoRoute, isRetrying, retryStartup]);

  const redirectTarget = useMemo(() => {
    if (hasStartupError) {
      return null;
    }

    if (authLoading || isProfileLoading) {
      return null;
    }

    if (!user) {
      return !isAuthRoute && !isPublicInfoRoute ? '/welcome' : null;
    }

    if (isCallbackRoute) {
      return null;
    }

    if (profileQuery.isSuccess && profileQuery.data === null) {
      return !isOnboardingRoute ? '/onboarding' : null;
    }

    if (!profileQuery.data) {
      return null;
    }

    return isAuthRoute ? '/(tabs)' : null;
  }, [
    authLoading,
    hasStartupError,
    isAuthRoute,
    isCallbackRoute,
    isOnboardingRoute,
    isPublicInfoRoute,
    profileQuery.data,
    profileQuery.isSuccess,
    isProfileLoading,
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
    !hasStartupError &&
    ((authLoading && !isPublicInfoRoute) ||
    isProfileLoading ||
    Boolean(user && profileQuery.data && isAuthRoute) ||
    Boolean(!user && !authLoading && !isAuthRoute && !isPublicInfoRoute) ||
    Boolean(
      user &&
        profileQuery.isSuccess &&
        profileQuery.data === null &&
        !isOnboardingRoute,
    ));
  const showStartupError = hasStartupError && !isPublicInfoRoute && !isCallbackRoute;
  const showOfflineState =
    !isOnline || resolutionTimedOut || isRequestTimeoutError(authError) ||
    isRequestTimeoutError(profileQuery.error);

  return (
    <View style={styles.container}>
      {children}
      {isResolvingAuthRoute ? (
        <View className="items-center justify-center bg-archive-900" style={StyleSheet.absoluteFill}>
          <ActivityIndicator color="#d7a94d" />
        </View>
      ) : null}
      {showStartupError ? (
        <View
          accessibilityLiveRegion="polite"
          className="items-center justify-center bg-archive-900 px-5"
          style={StyleSheet.absoluteFill}>
          <View className="w-full max-w-xl">
            <ErrorState
              title={showOfflineState ? "You're offline" : 'Unable to verify your account'}
              message={
                showOfflineState
                  ? "Revit couldn't verify your account. Check your connection and try again."
                  : "Revit couldn't verify your account right now. Try again."
              }
              retrying={isRetrying}
              onRetry={() => void retryStartup()}
            />
          </View>
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
