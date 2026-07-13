import { render, screen, waitFor } from '@testing-library/react-native';
import type { User } from '@supabase/supabase-js';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { Text } from 'react-native';

import { AuthGate } from '@/features/auth/AuthGate';
import { AuthCallbackScreen } from '@/features/auth/components/AuthCallbackScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';
import { getCurrentProfile } from '@/features/profile/api/profile-api';
import { supabase } from '@/lib/supabase/client';

import TitleDetailsRoute from '../app/title/[id]';
import ListDetailsRoute from '../app/lists/[id]';
import JournalEntryModalRoute from '../app/modals/journal-entry';
import ProfileRoute from '../app/profile';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/profile/hooks/useCurrentProfile', () => ({
  useCurrentProfile: jest.fn(),
}));

jest.mock('@/features/profile/api/profile-api', () => ({
  getCurrentProfile: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

jest.mock('@/features/media/components/TitleDetailsScreen', () => ({
  TitleDetailsScreen: ({ titleId }: { titleId?: string }) =>
    require('react').createElement(require('react-native').Text, null, `Title route: ${titleId}`),
}));

jest.mock('@/features/lists/components/ListDetailsScreen', () => ({
  ListDetailsScreen: ({ listId }: { listId?: string }) =>
    require('react').createElement(require('react-native').Text, null, `List route: ${listId}`),
}));

jest.mock('@/features/journal/components/JournalEntryModalScreen', () => ({
  JournalEntryModalScreen: ({ entryId, mediaItemId }: { entryId?: string; mediaItemId?: string }) =>
    require('react').createElement(
      require('react-native').Text,
      null,
      `Journal modal route: ${entryId} / ${mediaItemId}`,
    ),
}));

jest.mock('@/features/profile/components/ProfileScreen', () => ({
  ProfileScreen: () => require('react').createElement(require('react-native').Text, null, 'Profile route'),
}));

const mockAuth = jest.mocked(useAuth);
const mockCurrentProfile = jest.mocked(useCurrentProfile);
const mockGetCurrentProfile = jest.mocked(getCurrentProfile);
const mockRouterReplace = jest.mocked(router.replace);
const mockUsePathname = jest.mocked(usePathname);
const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const mockExchangeCodeForSession = jest.mocked(supabase.auth.exchangeCodeForSession);

function setAuthState({
  user = null,
  loading = false,
}: {
  user?: User | null;
  loading?: boolean;
} = {}) {
  mockAuth.mockReturnValue({
    session: null,
    signOut: jest.fn(),
    user,
    loading,
  });
}

function setProfileState(data?: object, isLoading = false) {
  mockCurrentProfile.mockReturnValue({
    data,
    isLoading,
  } as ReturnType<typeof useCurrentProfile>);
}

describe('auth route boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/journal');
    mockUseLocalSearchParams.mockReturnValue({});
    setAuthState();
    setProfileState();
  });

  it('sends an unauthenticated user away from a private route', async () => {
    await render(
      <AuthGate>
        <Text>Private content</Text>
      </AuthGate>,
    );

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/welcome'));
  });

  it('keeps public legal and support routes available without a session', async () => {
    mockUsePathname.mockReturnValue('/legal/privacy');

    await render(
      <AuthGate>
        <Text>Privacy policy</Text>
      </AuthGate>,
    );

    expect(screen.getByText('Privacy policy')).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('sends a signed-in user without a profile to onboarding', async () => {
    setAuthState({ user: { id: 'user-1' } as User });

    await render(
      <AuthGate>
        <Text>App content</Text>
      </AuthGate>,
    );

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding'));
  });

  it('sends a signed-in user with a profile to the tab shell when they are on auth routes', async () => {
    mockUsePathname.mockReturnValue('/welcome');
    setAuthState({ user: { id: 'user-1' } as User });
    setProfileState({ id: 'profile-1' });

    await render(
      <AuthGate>
        <Text>Welcome content</Text>
      </AuthGate>,
    );

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('does not redirect the callback route before the callback finishes', async () => {
    mockUsePathname.mockReturnValue('/callback');
    setAuthState({ user: { id: 'user-1' } as User });
    setProfileState(undefined, true);

    await render(
      <AuthGate>
        <Text>Callback content</Text>
      </AuthGate>,
    );

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});

describe('auth callback boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
    mockExchangeCodeForSession.mockReset();
    mockGetCurrentProfile.mockReset();
  });

  it('shows a clear message when the callback code is missing', async () => {
    await render(<AuthCallbackScreen />);

    await waitFor(() =>
      expect(screen.getByText('The sign-in link is missing a code. Please try again.')).toBeTruthy(),
    );
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('routes a completed callback with a profile to the app shell', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'code-with-profile' });
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    } as never);
    mockGetCurrentProfile.mockResolvedValue({ id: 'profile-1' } as never);

    await render(<AuthCallbackScreen />);

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('code-with-profile');
  });

  it('routes a completed callback without a profile to onboarding', async () => {
    mockUseLocalSearchParams.mockReturnValue({ code: 'code-without-profile' });
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: 'user-2' } } },
      error: null,
    } as never);
    mockGetCurrentProfile.mockResolvedValue(null);

    await render(<AuthCallbackScreen />);

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/onboarding'));
  });
});

describe('route parameter boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes a title id from the route to the title details screen', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'tmdb-movie-123' });

    await render(<TitleDetailsRoute />);

    expect(screen.getByText('Title route: tmdb-movie-123')).toBeTruthy();
  });

  it('passes a list id from the route to the list details screen', async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: 'list-123' });

    await render(<ListDetailsRoute />);

    expect(screen.getByText('List route: list-123')).toBeTruthy();
  });

  it('passes modal entry and media ids from the route', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      entryId: 'entry-123',
      mediaItemId: 'media-123',
    });

    await render(<JournalEntryModalRoute />);

    expect(screen.getByText('Journal modal route: entry-123 / media-123')).toBeTruthy();
  });

  it('keeps the profile route focused on the profile screen', async () => {
    await render(<ProfileRoute />);

    expect(screen.getByText('Profile route')).toBeTruthy();
  });
});
