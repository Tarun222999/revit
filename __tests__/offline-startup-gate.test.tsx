import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { router, usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';

import { AuthGate } from '@/features/auth/AuthGate';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';
import type { Profile } from '@/features/profile/api/profile-api';
import { supabase } from '@/lib/supabase/client';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  usePathname: jest.fn(),
}));

jest.mock('@/features/profile/hooks/useCurrentProfile', () => ({
  useCurrentProfile: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
    },
  },
}));

const STARTUP_TIMEOUT_MS = 10_000;
const mockGetSession = jest.mocked(supabase.auth.getSession);
const mockCurrentProfile = jest.mocked(useCurrentProfile);
const mockRouterReplace = jest.mocked(router.replace);
const mockUsePathname = jest.mocked(usePathname);
let warnSpy: jest.SpyInstance;

const authUser = {
  app_metadata: { provider: 'google', providers: ['google'] },
  aud: 'authenticated',
  created_at: '2026-09-06T05:00:00.000Z',
  id: 'user-1',
  user_metadata: {},
} as User;

const authSession = {
  access_token: 'access-token',
  expires_in: 3600,
  refresh_token: 'refresh-token',
  token_type: 'bearer',
  user: authUser,
} as Session;

const profile = {
  avatar_path: null,
  bio: null,
  created_at: '2026-09-06T05:00:00.000Z',
  display_name: 'Maya',
  id: 'user-1',
  updated_at: '2026-09-06T05:00:00.000Z',
  username: 'maya',
} satisfies Profile;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

function renderPrivateRoute() {
  return render(
    <AuthGate>
      <Text>Private content</Text>
    </AuthGate>,
    { wrapper: createWrapper() },
  );
}

function setProfileResult({
  data,
  error = null,
  isError = false,
  isLoading = false,
  isPending = isLoading,
  isSuccess = true,
  refetch = jest.fn(),
}: {
  data?: Profile | null;
  error?: Error | null;
  isError?: boolean;
  isLoading?: boolean;
  isPending?: boolean;
  isSuccess?: boolean;
  refetch?: jest.Mock;
}) {
  mockCurrentProfile.mockReturnValue({
    data,
    error,
    isError,
    isLoading,
    isPending,
    isSuccess,
    refetch,
  } as unknown as ReturnType<typeof useCurrentProfile>);
}

describe('offline startup auth gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    onlineManager.setOnline(true);
    mockUsePathname.mockReturnValue('/journal');
    setProfileResult({ data: profile });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  it('replaces a stalled session spinner with an actionable connection state', async () => {
    jest.useFakeTimers();
    mockGetSession.mockReturnValue(new Promise(() => undefined));

    await renderPrivateRoute();

    await act(async () => {
      jest.advanceTimersByTime(STARTUP_TIMEOUT_MS);
    });

    expect(screen.getByText("You're offline")).toBeTruthy();
    expect(
      screen.getByText(
        "Revit couldn't verify your account. Check your connection and try again.",
      ),
    ).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/welcome');
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/onboarding');
  });

  it('recovers after retrying a stalled session when connectivity returns', async () => {
    jest.useFakeTimers();
    mockGetSession
      .mockReturnValueOnce(new Promise(() => undefined))
      .mockResolvedValueOnce({ data: { session: authSession }, error: null });

    await renderPrivateRoute();

    await act(async () => {
      jest.advanceTimersByTime(STARTUP_TIMEOUT_MS);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Try again'));
    });

    await waitFor(() => expect(screen.getByText('Private content')).toBeTruthy());
    expect(mockGetSession).toHaveBeenCalledTimes(2);
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/welcome');
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/onboarding');
  });

  it('replaces a stalled profile spinner with the actionable connection state', async () => {
    jest.useFakeTimers();
    mockGetSession.mockResolvedValue({ data: { session: authSession }, error: null });
    setProfileResult({
      data: undefined,
      isLoading: true,
      isSuccess: false,
    });

    await renderPrivateRoute();

    await act(async () => {
      jest.advanceTimersByTime(STARTUP_TIMEOUT_MS);
    });

    expect(screen.getByText("You're offline")).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/onboarding');
  });

  it('shows retry instead of onboarding when profile resolution fails', async () => {
    const refetch = jest.fn();
    mockGetSession.mockResolvedValue({ data: { session: authSession }, error: null });
    setProfileResult({
      data: undefined,
      error: new Error('Network request failed'),
      isError: true,
      isLoading: false,
      isSuccess: false,
      refetch,
    });

    await renderPrivateRoute();

    await waitFor(() => expect(screen.getByText('Unable to verify your account')).toBeTruthy());
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/onboarding');

    fireEvent.press(screen.getByText('Try again'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('automatically retries a failed startup when connectivity returns', async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({ data: { session: authSession }, error: null });
    setProfileResult({
      data: undefined,
      error: new Error('Network request failed'),
      isError: true,
      isLoading: false,
      isPending: false,
      isSuccess: false,
      refetch,
    });

    await renderPrivateRoute();
    await waitFor(() => expect(screen.getByText('Unable to verify your account')).toBeTruthy());

    await act(async () => {
      onlineManager.setOnline(false);
    });
    await act(async () => {
      onlineManager.setOnline(true);
    });

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it('routes to onboarding only after a successful missing-profile result', async () => {
    mockGetSession.mockResolvedValue({ data: { session: authSession }, error: null });
    setProfileResult({ data: null, isSuccess: true });

    await renderPrivateRoute();

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding'));
  });
});
