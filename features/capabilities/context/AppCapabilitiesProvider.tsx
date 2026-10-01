import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { getAppCapabilities } from '../api/app-capabilities-api';

const CAPABILITY_STALE_TIME_MS = 60 * 1000;
const CAPABILITY_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function getCapabilityRefreshInterval(isAppActive: boolean) {
  return isAppActive ? CAPABILITY_REFRESH_INTERVAL_MS : false;
}

export const appCapabilitiesQueryKey = ['app-capabilities'] as const;

type AppCapabilitiesContextValue = {
  gamesEnabled: boolean;
  isResolved: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

const AppCapabilitiesContext = createContext<AppCapabilitiesContextValue | null>(
  null,
);

export function AppCapabilitiesProvider({ children }: PropsWithChildren) {
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === 'active',
  );
  const query = useQuery({
    queryKey: appCapabilitiesQueryKey,
    queryFn: getAppCapabilities,
    staleTime: CAPABILITY_STALE_TIME_MS,
    refetchInterval: getCapabilityRefreshInterval(isAppActive),
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const nextIsActive = nextState === 'active';
      setIsAppActive(nextIsActive);

      if (nextIsActive) {
        void query.refetch();
      }
    });

    return () => subscription.remove();
  }, [query.refetch]);

  const value = useMemo<AppCapabilitiesContextValue>(
    () => ({
      // Missing, malformed, loading, and failed capability requests fail closed.
      gamesEnabled:
        query.isSuccess &&
        !query.isRefetchError &&
        !query.isFetching &&
        query.data.gamesEnabled === true,
      isResolved: query.isSuccess && !query.isRefetchError,
      isRefreshing: query.isFetching,
      refresh: async () => {
        await query.refetch();
      },
    }),
    [
      query.data,
      query.isFetching,
      query.isRefetchError,
      query.isSuccess,
      query.refetch,
    ],
  );

  return (
    <AppCapabilitiesContext.Provider value={value}>
      {children}
    </AppCapabilitiesContext.Provider>
  );
}

export function useAppCapabilities() {
  const value = useContext(AppCapabilitiesContext);

  if (!value) {
    throw new Error(
      'useAppCapabilities must be used inside AppCapabilitiesProvider.',
    );
  }

  return value;
}

/**
 * Modal routes can be rendered independently by native navigation and tests.
 * They must fail closed for a capability they cannot resolve, rather than
 * assuming Games is enabled or throwing before their own unavailable state.
 */
export function useOptionalAppCapabilities(): AppCapabilitiesContextValue {
  return useContext(AppCapabilitiesContext) ?? {
    gamesEnabled: false,
    isRefreshing: false,
    isResolved: false,
    refresh: async () => undefined,
  };
}
