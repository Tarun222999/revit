import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SharedListScreen } from '@/features/sharing/components/SharedListScreen';
import { SharedListUnavailableError } from '@/features/sharing/api/list-sharing-api';
import type { SharedListPage } from '@/types/sharedList';

const mockLoad = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockUser: { id: string } | null = null;
const key = 'a'.repeat(64);
jest.mock('@/features/sharing/api/list-sharing-api', () => ({
  ...jest.requireActual('@/features/sharing/api/list-sharing-api'),
  getSharedList: (...args: unknown[]) => mockLoad(...args),
}));
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));
jest.mock('@/lib/query/network', () => ({ useOnlineStatus: () => true }));
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  Stack: { Screen: () => null },
  useFocusEffect: () => undefined,
}));
jest.mock('@/features/lists/components/CollectionArtwork', () => ({
  CollectionArtwork: () => null,
}));
const page: SharedListPage = {
  name: 'Favorites',
  description: 'My picks',
  itemCount: 1,
  coverItems: [],
  items: [
    {
      source: 'tmdb',
      sourceId: 'movie:550',
      title: 'Fight Club',
      mediaType: 'movie',
      year: '1999',
      imageUrl: null,
    },
  ],
  isOwner: false,
  nextCursor: null,
};
async function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <SharedListScreen shareKey={key} />
    </QueryClientProvider>,
  );
  return { ...view, client };
}
beforeEach(() => {
  mockUser = null;
  mockLoad.mockReset();
  mockPush.mockReset();
  mockReplace.mockReset();
  mockLoad.mockResolvedValue(page);
});

it('lets anonymous recipients read and open titles without management controls', async () => {
  await show();
  await waitFor(() => expect(screen.getByText('Favorites')).toBeTruthy());
  expect(screen.getByText('Shared list · Read only')).toBeTruthy();
  expect(screen.getByText('Sign in to save titles')).toBeTruthy();
  expect(screen.queryByText('Edit list')).toBeNull();
  expect(screen.queryByText('Stop sharing')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Open Fight Club, movie'));
  expect(mockPush).toHaveBeenCalledWith('/title/tmdb%3Amovie%3A550');
  await fireEvent.press(screen.getByText('Sign in to save titles'));
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/welcome',
      params: { returnTo: `revit://shared/list/${key}` },
    }),
  );
});
it('redirects only a verified owner', async () => {
  mockUser = { id: 'owner' };
  mockLoad.mockResolvedValue({
    ...page,
    isOwner: true,
    listId: 'private-list',
  });
  await show();
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/lists/[id]',
      params: { id: 'private-list' },
    }),
  );
});
it('removes rendered titles when a later page reports a revoked link', async () => {
  mockLoad
    .mockResolvedValueOnce({ ...page, nextCursor: 'next' })
    .mockRejectedValueOnce(new SharedListUnavailableError());
  await show();
  await waitFor(() =>
    expect(screen.getByText('Load more titles')).toBeTruthy(),
  );
  await fireEvent.press(screen.getByText('Load more titles'));
  await waitFor(() =>
    expect(screen.getByText('Shared list unavailable')).toBeTruthy(),
  );
  expect(screen.queryByText('Fight Club')).toBeNull();
});
it('keeps loaded titles for retryable pagination failures', async () => {
  mockLoad
    .mockResolvedValueOnce({ ...page, nextCursor: 'next' })
    .mockRejectedValueOnce(new Error('offline'));
  await show();
  await waitFor(() =>
    expect(screen.getByText('Load more titles')).toBeTruthy(),
  );
  await fireEvent.press(screen.getByText('Load more titles'));
  await waitFor(() =>
    expect(
      screen.getByText('Unable to load more titles. Try again.'),
    ).toBeTruthy(),
  );
  expect(screen.getByText('Fight Club')).toBeTruthy();
});
it('shows the empty-list state and re-resolves after account switching', async () => {
  mockLoad.mockResolvedValue({ ...page, itemCount: 0, items: [] });
  const { rerender, client } = await show();
  await waitFor(() =>
    expect(screen.getByText('No titles added yet')).toBeTruthy(),
  );
  const before = mockLoad.mock.calls.length;
  mockUser = { id: 'recipient' };
  await rerender(
    <QueryClientProvider client={client}>
      <SharedListScreen shareKey={key} />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(mockLoad.mock.calls.length).toBeGreaterThan(before),
  );
  expect(screen.queryByText('Sign in to save titles')).toBeNull();
});
