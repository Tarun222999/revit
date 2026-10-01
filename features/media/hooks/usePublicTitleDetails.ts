import { useQuery } from '@tanstack/react-query';

import { getPublicTitle } from '@/features/media/api/public-title-api';

export const publicTitleDetailsQueryKey = (titleId?: string) =>
  ['public-title', titleId] as const;

export function usePublicTitleDetails(titleId?: string) {
  return useQuery({
    queryKey: publicTitleDetailsQueryKey(titleId),
    queryFn: () => getPublicTitle(titleId ?? ''),
    enabled: Boolean(titleId),
    staleTime: 5 * 60 * 1000,
  });
}
