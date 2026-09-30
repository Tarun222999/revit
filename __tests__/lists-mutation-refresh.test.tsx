import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import {
  useAddMediaItemToList,
  useRemoveListItem,
  useUpdateListItemNote,
  useUpdateList,
  useDeleteList,
} from '@/features/lists/hooks/useListMutations';
import { listDetailsQueryKey } from '@/features/lists/hooks/useListDetails';
import { userListsQueryKey } from '@/features/lists/hooks/useUserLists';
import { mediaListMembershipsQueryKey } from '@/features/lists/hooks/useMediaListMemberships';

jest.mock('@/features/lists/api/list-api', () => ({
  addMediaItemToList: jest.fn(async () => ({
    list_id: 'list',
    media_item_id: 'media',
  })),
  removeListItem: jest.fn(async () => ({
    list_id: 'list',
    media_item_id: 'media',
  })),
  updateListItemNote: jest.fn(async () => ({
    list_id: 'list',
    media_item_id: 'media',
  })),
  updateList: jest.fn(async () => ({ id: 'list', user_id: 'owner' })),
  deleteList: jest.fn(async () => ({ id: 'list', user_id: 'owner' })),
}));

it('refreshes both screens and actual membership after add, remove, and note writes without touching Journal caches', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = await renderHook(
    () => ({
      add: useAddMediaItemToList(),
      remove: useRemoveListItem(),
      note: useUpdateListItemNote(),
    }),
    { wrapper },
  );
  for (const write of [
    () =>
      result.current.add.mutateAsync({
        listId: 'list',
        mediaItemId: 'media',
        userId: 'owner',
      }),
    () =>
      result.current.remove.mutateAsync({
        listItemId: 'item',
        mediaItemId: 'media',
        userId: 'owner',
      }),
    () =>
      result.current.note.mutateAsync({
        listItemId: 'item',
        note: null,
        userId: 'owner',
      }),
  ]) {
    invalidate.mockClear();
    await act(async () => {
      await write();
    });
    expect(invalidate.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
      userListsQueryKey('owner'),
      listDetailsQueryKey('owner', 'list'),
      mediaListMembershipsQueryKey('owner', 'media'),
    ]);
  }
});

it('refreshes edited metadata and removes only deleted-list Details cache', async () => {
  const client = new QueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const removeCache = jest.spyOn(client, 'removeQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = await renderHook(
    () => ({ update: useUpdateList(), deletion: useDeleteList() }),
    { wrapper },
  );
  await act(async () => {
    await result.current.update.mutateAsync({
      userId: 'owner',
      listId: 'list',
      name: 'Updated',
      description: '',
    });
  });
  expect(invalidate.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
    userListsQueryKey('owner'),
    listDetailsQueryKey('owner', 'list'),
  ]);
  await act(async () => {
    await result.current.deletion.mutateAsync({
      userId: 'owner',
      listId: 'list',
    });
  });
  expect(removeCache).toHaveBeenCalledWith({
    queryKey: listDetailsQueryKey('owner', 'list'),
  });
});
