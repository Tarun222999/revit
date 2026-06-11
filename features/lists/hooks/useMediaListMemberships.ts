import { useQuery } from '@tanstack/react-query';

import { getMediaListMemberships } from '@/features/lists/api/list-api';
import { userListsQueryKey } from '@/features/lists/hooks/useUserLists';

export const mediaListMembershipsQueryKey = (
  userId?: string,
  mediaItemId?: string,
) => [...userListsQueryKey(userId), 'media', mediaItemId, 'memberships'] as const;

export function useMediaListMemberships(
  userId?: string,
  mediaItemId?: string,
) {
  return useQuery({
    queryKey: mediaListMembershipsQueryKey(userId, mediaItemId),
    queryFn: () =>
      getMediaListMemberships({
        mediaItemId: mediaItemId ?? '',
        userId: userId ?? '',
      }),
    enabled: Boolean(userId && mediaItemId),
  });
}
