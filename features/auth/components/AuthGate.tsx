import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';

export function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const profileQuery = useCurrentProfile(user?.id);

  const isWelcomeRoute = pathname === '/welcome';
  const isEmailCodeRoute = pathname === '/email-code';
  const isCallbackRoute = pathname === '/callback';
  const isOnboardingRoute = pathname === '/onboarding';
  const isAuthRoute = isWelcomeRoute || isEmailCodeRoute || isCallbackRoute || isOnboardingRoute;

  useEffect(() => {
    if (authLoading || (user && profileQuery.isLoading && !isCallbackRoute)) {
      return;
    }

    if (!user) {
      if (!isAuthRoute) {
        router.replace('/welcome');
      }

      return;
    }

    if (isCallbackRoute) {
      return;
    }

    if (!profileQuery.data) {
      if (!isOnboardingRoute) {
        router.replace('/onboarding');
      }

      return;
    }

    if (isAuthRoute) {
      router.replace('/home');
    }
  }, [
    authLoading,
    isAuthRoute,
    isCallbackRoute,
    isOnboardingRoute,
    profileQuery.data,
    profileQuery.isLoading,
    user,
  ]);

  return <>{children}</>;
}
