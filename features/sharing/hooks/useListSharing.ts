import { useQuery } from '@tanstack/react-query';
import { manageListSharing } from '@/features/sharing/api/list-sharing-api';

export function useListSharing(userId?: string, listId?: string) {
  return useQuery({
    queryKey: ['list-sharing', userId, listId],
    queryFn: () => manageListSharing({ listId: listId!, action: 'state' }),
    enabled: Boolean(userId && listId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
