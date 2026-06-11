import { useQuery } from '@tanstack/react-query';

import { getUserLists } from '@/features/lists/api/list-api';

export const userListsQueryKey = (userId?: string) =>
  ['lists', 'user', userId] as const;

export function useUserLists(userId?: string) {
  return useQuery({
    queryKey: userListsQueryKey(userId),
    queryFn: () => getUserLists(userId ?? ''),
    enabled: Boolean(userId),
  });
}
