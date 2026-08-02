import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import {
  getDiscoverRail,
} from '@/features/discovery/api/discover-api';
import { searchTitles } from '@/features/discovery/api/search-api';
import { useDiscoverRail } from '@/features/discovery/hooks/useDiscoverRail';
import { useSearchTitles } from '@/features/discovery/hooks/useSearchTitles';
import { getMediaDetails, getMediaTrailer } from '@/features/media/api/media-api';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';
import { useMediaTrailer } from '@/features/media/hooks/useMediaTrailer';
import {
  createJournalEntry,
  deleteJournalEntry,
} from '@/features/journal/api/journal-api';
import {
  journalEntriesQueryKey,
  journalEntryForMediaQueryKey,
} from '@/features/journal/hooks/useJournalEntryForMedia';
import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
} from '@/features/journal/hooks/useJournalEntryMutations';
import { createList } from '@/features/lists/api/list-api';
import { userListsQueryKey } from '@/features/lists/hooks/useUserLists';
import { useCreateList } from '@/features/lists/hooks/useListMutations';
import {
  deleteAccount,
  updateProfile,
  type Profile,
} from '@/features/profile/api/profile-api';
import { currentProfileQueryKey } from '@/features/profile/hooks/useCurrentProfile';
import { useDeleteAccount } from '@/features/profile/hooks/useDeleteAccount';
import { useUpdateProfile } from '@/features/profile/hooks/useUpdateProfile';
import { supabase } from '@/lib/supabase/client';
import type { CreateJournalEntryInput, JournalEntry } from '@/features/journal/types';
import type { NormalizedMediaItem } from '@/types/media';

jest.mock('@/features/discovery/api/discover-api', () => ({
  getDiscoverRail: jest.fn(),
}));

jest.mock('@/features/discovery/api/search-api', () => ({
  searchTitles: jest.fn(),
}));

jest.mock('@/features/media/api/media-api', () => ({
  getMediaDetails: jest.fn(),
  getMediaTrailer: jest.fn(),
  parseMediaRouteId: jest.fn((routeId: string) => ({ mediaItemId: routeId })),
}));

jest.mock('@/features/journal/api/journal-api', () => ({
  createJournalEntry: jest.fn(),
  deleteJournalEntry: jest.fn(),
}));

jest.mock('@/features/lists/api/list-api', () => ({
  createList: jest.fn(),
}));

jest.mock('@/features/profile/api/profile-api', () => ({
  createProfile: jest.fn(),
  deleteAccount: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
    },
  },
}));

const mockGetDiscoverRail = jest.mocked(getDiscoverRail);
const mockSearchTitles = jest.mocked(searchTitles);
const mockGetMediaDetails = jest.mocked(getMediaDetails);
const mockGetMediaTrailer = jest.mocked(getMediaTrailer);
const mockCreateJournalEntry = jest.mocked(createJournalEntry);
const mockDeleteJournalEntry = jest.mocked(deleteJournalEntry);
const mockCreateList = jest.mocked(createList);
const mockDeleteAccount = jest.mocked(deleteAccount);
const mockUpdateProfile = jest.mocked(updateProfile);
const mockSignOut = jest.mocked(supabase.auth.signOut);
const testQueryClients: QueryClient[] = [];

const mediaItem = {
  source: 'tmdb',
  sourceId: '123',
  mediaType: 'movie',
  title: 'Dune',
  genres: [],
  metadata: {},
} satisfies NormalizedMediaItem;

const journalEntry = {
  effective_status: 'completed',
  completed_on: '2026-07-13',
  contains_spoilers: false,
  created_at: '2026-07-13T10:00:00.000Z',
  has_active_plan: false,
  id: 'entry-1',
  last_activity_at: '2026-07-13T10:00:00.000Z',
  legacy_bridge_statement_at: null,
  legacy_plan_resolution_statement_at: null,
  media_item_id: 'media-1',
  planned_for: null,
  rating: 4.5,
  review_body: null,
  review_headline: null,
  started_on: null,
  status: 'completed',
  updated_at: '2026-07-13T10:00:00.000Z',
  undated_completed_count: 0,
  user_id: 'user-1',
} satisfies JournalEntry;

const createJournalEntryInput: CreateJournalEntryInput = {
  completedOn: '2026-07-13',
  containsSpoilers: false,
  mediaItemId: 'media-1',
  rating: 4.5,
  reviewBody: '',
  reviewHeadline: '',
  startedOn: null,
  status: 'completed',
  userId: 'user-1',
};

const profile = {
  avatar_path: null,
  bio: 'A short bio',
  created_at: '2026-07-13T10:00:00.000Z',
  display_name: 'Maya',
  id: 'user-1',
  updated_at: '2026-07-13T10:00:00.000Z',
  username: 'maya',
} satisfies Profile;

function createTestQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: 0, retry: false },
      queries: { gcTime: 0, retry: false },
    },
  });

  testQueryClients.push(queryClient);

  return queryClient;
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

afterEach(async () => {
  await act(async () => {
    testQueryClients.forEach((queryClient) => queryClient.clear());
  });
  testQueryClients.length = 0;
});

describe('data query hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not search until the query has at least two characters', async () => {
    const queryClient = createTestQueryClient();
    const { result } = await renderHook(
      () => useSearchTitles('d'),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockSearchTitles).not.toHaveBeenCalled();
  });

  it('returns search results and normalizes the query input', async () => {
    mockSearchTitles.mockResolvedValue({
      results: [mediaItem],
      page: 1,
      totalPages: 1,
    });
    const queryClient = createTestQueryClient();

    const { result } = await renderHook(
      () => useSearchTitles('  dune  ', 'movie'),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.results).toEqual([mediaItem]);
    expect(mockSearchTitles).toHaveBeenCalledWith({
      mediaType: 'movie',
      page: 1,
      query: 'dune',
    });
  });

  it('returns an empty result set without treating it as a request failure', async () => {
    mockSearchTitles.mockResolvedValue({
      results: [],
      page: 1,
      totalPages: 0,
    });
    const queryClient = createTestQueryClient();

    const { result } = await renderHook(
      () => useSearchTitles('unknown title'),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.results).toEqual([]);
  });

  it('exposes search request failures to the screen', async () => {
    mockSearchTitles.mockRejectedValue(new Error('Search service unavailable'));
    const queryClient = createTestQueryClient();

    const { result } = await renderHook(
      () => useSearchTitles('dune'),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Search service unavailable'));
  });

  it('exposes discovery failures and can recover when the query is retried', async () => {
    mockGetDiscoverRail
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({
        results: [mediaItem],
        page: 1,
        totalPages: 1,
      });
    const queryClient = createTestQueryClient();

    const { result } = await renderHook(
      () => useDiscoverRail('trending', 'movie'),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results).toEqual([mediaItem]);
    expect(mockGetDiscoverRail).toHaveBeenCalledTimes(2);
  });

  it('loads title details only when a route id is present', async () => {
    mockGetMediaDetails.mockResolvedValue({ item: mediaItem });
    const queryClient = createTestQueryClient();

    const { result, rerender } = await renderHook(
      ({ routeId }: { routeId?: string }) => useMediaDetails(routeId),
      {
        initialProps: { routeId: undefined },
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMediaDetails).not.toHaveBeenCalled();

    await rerender({ routeId: 'media-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.item).toEqual(mediaItem);
    expect(mockGetMediaDetails).toHaveBeenCalledWith({ mediaItemId: 'media-1' });
  });

  it('loads and caches a TMDB trailer only when a source id is present', async () => {
    mockGetMediaTrailer.mockResolvedValue({
      trailer: {
        key: 'trailer123',
        name: 'Official Trailer',
        site: 'YouTube',
      },
    });
    const queryClient = createTestQueryClient();

    const { result, rerender } = await renderHook(
      ({ sourceId }: { sourceId?: string }) => useMediaTrailer(sourceId),
      {
        initialProps: { sourceId: undefined },
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMediaTrailer).not.toHaveBeenCalled();

    await rerender({ sourceId: 'movie:123' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.trailer?.key).toBe('trailer123');
    expect(mockGetMediaTrailer).toHaveBeenCalledWith({
      source: 'tmdb',
      sourceId: 'movie:123',
    });
  });
});

describe('journal and list mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('caches a created journal entry and invalidates the user journal list', async () => {
    mockCreateJournalEntry.mockResolvedValue(journalEntry);
    const queryClient = createTestQueryClient();
    const setQueryData = jest.spyOn(queryClient, 'setQueryData');
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result, unmount } = await renderHook(() => useCreateJournalEntry(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        ...createJournalEntryInput,
      });
    });

    expect(setQueryData).toHaveBeenCalledWith(
      journalEntryForMediaQueryKey('user-1', 'media-1'),
      journalEntry,
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: journalEntriesQueryKey('user-1'),
    });
    await unmount();
  });

  it('exposes journal creation failures without changing cached data', async () => {
    const mutationError = new Error('Could not save journal entry.');
    mockCreateJournalEntry.mockRejectedValue(mutationError);
    const queryClient = createTestQueryClient();
    const setQueryData = jest.spyOn(queryClient, 'setQueryData');
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result, unmount } = await renderHook(() => useCreateJournalEntry(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(createJournalEntryInput)).rejects.toThrow(
        'Could not save journal entry.',
      );
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mutationError);
    });
    expect(setQueryData).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    await unmount();
  });

  it('clears a deleted journal entry from the detail cache', async () => {
    mockDeleteJournalEntry.mockResolvedValue(journalEntry);
    const queryClient = createTestQueryClient();
    const setQueryData = jest.spyOn(queryClient, 'setQueryData');
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result, unmount } = await renderHook(() => useDeleteJournalEntry(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('entry-1');
    });

    expect(setQueryData).toHaveBeenCalledWith(
      journalEntryForMediaQueryKey('user-1', 'media-1'),
      null,
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: journalEntriesQueryKey('user-1'),
    });
    await unmount();
  });

  it('invalidates the user lists after creating a list', async () => {
    const list = {
      created_at: '2026-07-13T10:00:00.000Z',
      description: null,
      id: 'list-1',
      is_default: false,
      name: 'Favorites',
      updated_at: '2026-07-13T10:00:00.000Z',
      user_id: 'user-1',
    };
    mockCreateList.mockResolvedValue(list);
    const queryClient = createTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');

    const { result, unmount } = await renderHook(() => useCreateList(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Favorites',
        userId: 'user-1',
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: userListsQueryKey('user-1'),
    });
    await unmount();
  });
});

describe('profile mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the cached profile after a successful profile update', async () => {
    mockUpdateProfile.mockResolvedValue(profile);
    const queryClient = createTestQueryClient();
    const setQueryData = jest.spyOn(queryClient, 'setQueryData');

    const { result, unmount } = await renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        bio: 'A short bio',
        displayName: 'Maya',
        userId: 'user-1',
        username: 'maya',
      });
    });

    expect(setQueryData).toHaveBeenCalledWith(currentProfileQueryKey('user-1'), profile);
    await unmount();
  });

  it('exposes profile update failures without replacing the cached profile', async () => {
    const mutationError = new Error('Could not update your profile.');
    mockUpdateProfile.mockRejectedValue(mutationError);
    const queryClient = createTestQueryClient();
    const setQueryData = jest.spyOn(queryClient, 'setQueryData');

    const { result, unmount } = await renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          bio: 'A short bio',
          displayName: 'Maya',
          userId: 'user-1',
          username: 'maya',
        }),
      ).rejects.toThrow('Could not update your profile.');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mutationError);
    });
    expect(setQueryData).not.toHaveBeenCalled();
    await unmount();
  });

  it('clears cached data and signs out locally after account deletion', async () => {
    mockDeleteAccount.mockResolvedValue({ deleted: true });
    mockSignOut.mockResolvedValue({ error: null });
    const queryClient = createTestQueryClient();
    const clear = jest.spyOn(queryClient, 'clear');

    const { result, unmount } = await renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(clear).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    await unmount();
  });

  it('does not clear cached data or sign out when account deletion fails', async () => {
    const mutationError = new Error('Account deletion failed.');
    mockDeleteAccount.mockRejectedValue(mutationError);
    const queryClient = createTestQueryClient();
    const clear = jest.spyOn(queryClient, 'clear');

    const { result, unmount } = await renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Account deletion failed.');
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mutationError);
    });
    expect(clear).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
    await unmount();
  });
});
