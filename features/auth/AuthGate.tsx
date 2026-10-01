import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  clearPendingAuthReturnToSafely,
  getPendingAuthDestination,
  getPendingAuthReturnTo,
  getStoredPendingAuthReturnTo,
  getSharedTitleAuthReturnTo,
  storePendingAuthReturnTo,
} from '@/features/auth/utils/pendingDestination';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';
import { useOnlineStatus } from '@/lib/query/network';
import { isPotentialTitleSharePath } from '@/features/sharing/model/titleShare';
import {
  isRequestTimeoutError,
  STARTUP_REQUEST_TIMEOUT_MS,
} from '@/lib/query/requestTimeout';

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { returnTo } = useGlobalSearchParams<{ returnTo?: string | string[] }>();
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
  const isPublicSharedTitleRoute = isPotentialTitleSharePath(pathname);
  const isPublicRoute = isPublicInfoRoute || isPublicSharedTitleRoute;
  const isAuthRoute = isWelcomeRoute || isEmailCodeRoute || isCallbackRoute || isOnboardingRoute;
  const [storedReturnTo, setStoredReturnTo] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    void getStoredPendingAuthReturnTo()
      .then((destination) => {
        if (active) setStoredReturnTo(destination);
      })
      .catch(() => {
        if (active) setStoredReturnTo(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const pendingReturnTo = useMemo(
    () => getPendingAuthReturnTo(returnTo) ?? getSharedTitleAuthReturnTo(pathname) ?? storedReturnTo,
    [pathname, returnTo, storedReturnTo],
  );
  const pendingDestination = useMemo(
    () => getPendingAuthDestination(pendingReturnTo ?? undefined),
    [pendingReturnTo],
  );

  useEffect(() => {
    const restoredTitle = getSharedTitleAuthReturnTo(pathname);

    if (!profileQuery.data || !restoredTitle || restoredTitle !== storedReturnTo) {
      return;
    }

    setStoredReturnTo(null);
    void clearPendingAuthReturnToSafely();
  }, [pathname, profileQuery.data, storedReturnTo]);
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

    if (!wasOnline && isOnline && hasStartupError && !isPublicRoute && !isRetrying) {
      void retryStartup();
    }
  }, [hasStartupError, isOnline, isPublicRoute, isRetrying, retryStartup]);

  const redirectTarget = useMemo(() => {
    if (hasStartupError) {
      return null;
    }

    if (authLoading || isProfileLoading) {
      return null;
    }

    if (isAuthRoute && storedReturnTo === undefined) {
      return null;
    }

    if (!user) {
      return !isAuthRoute && !isPublicRoute ? '/welcome' : null;
    }

    if (isCallbackRoute) {
      return null;
    }

    if (profileQuery.isSuccess && profileQuery.data === null) {
      return !isOnboardingRoute
        ? pendingReturnTo
          ? { pathname: '/onboarding', params: { returnTo: pendingReturnTo } }
          : '/onboarding'
        : null;
    }

    if (!profileQuery.data) {
      return null;
    }

    return isAuthRoute ? pendingDestination ?? '/(tabs)' : null;
  }, [
    authLoading,
    hasStartupError,
    isAuthRoute,
    isCallbackRoute,
    isOnboardingRoute,
    isPublicRoute,
    pendingDestination,
    pendingReturnTo,
    profileQuery.data,
    profileQuery.isSuccess,
    isProfileLoading,
    storedReturnTo,
    user,
  ]);

  useEffect(() => {
    if (!redirectTarget) {
      lastRedirectKeyRef.current = null;
      return;
    }

    const redirectKey = `${pathname}->${JSON.stringify(redirectTarget)}`;

    if (lastRedirectKeyRef.current === redirectKey) {
      return;
    }

    lastRedirectKeyRef.current = redirectKey;
    const needsOnboardingStorage = Boolean(
      user &&
        profileQuery.isSuccess &&
        profileQuery.data === null &&
        !isOnboardingRoute &&
        pendingReturnTo,
    );

    if (needsOnboardingStorage && pendingReturnTo) {
      void storePendingAuthReturnTo(pendingReturnTo)
        .catch(() => undefined)
        .then(() => router.replace(redirectTarget));
      return;
    }

    router.replace(redirectTarget);
  }, [isOnboardingRoute, pathname, pendingReturnTo, profileQuery.data, profileQuery.isSuccess, redirectTarget, user]);

  const isResolvingAuthRoute =
    !hasStartupError &&
    ((authLoading && !isPublicRoute) ||
    Boolean(isAuthRoute && storedReturnTo === undefined) ||
    isProfileLoading ||
    Boolean(user && profileQuery.data && isAuthRoute) ||
    Boolean(!user && !authLoading && !isAuthRoute && !isPublicRoute) ||
    Boolean(
      user &&
        profileQuery.isSuccess &&
        profileQuery.data === null &&
        !isOnboardingRoute,
    ));
  const showStartupError = hasStartupError && !isPublicRoute && !isCallbackRoute;
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
