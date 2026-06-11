import { useQuery } from '@tanstack/react-query';

import { getListDetails } from '@/features/lists/api/list-api';
import { userListsQueryKey } from '@/features/lists/hooks/useUserLists';

export const listDetailsQueryKey = (userId?: string, listId?: string) =>
  [...userListsQueryKey(userId), 'details', listId] as const;

export function useListDetails(userId?: string, listId?: string) {
  return useQuery({
    queryKey: listDetailsQueryKey(userId, listId),
    queryFn: () =>
      getListDetails({
        listId: listId ?? '',
        userId: userId ?? '',
      }),
    enabled: Boolean(userId && listId),
  });
}
