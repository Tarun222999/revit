import { useQuery } from '@tanstack/react-query';

import { getDiscoverRail } from '@/features/discovery/api/discover-api';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';

export const discoverRailQueryKey = (
  mode: DiscoveryMode,
  mediaType: DiscoveryMediaType,
  page: number,
) => ['media', 'discover', mode, mediaType, page] as const;

export function useDiscoverRail(
  mode: DiscoveryMode,
  mediaType: DiscoveryMediaType,
  page = 1,
) {
  return useQuery({
    queryKey: discoverRailQueryKey(mode, mediaType, page),
    queryFn: () =>
      getDiscoverRail({
        mode,
        mediaType,
        page,
      }),
    staleTime: 5 * 60 * 1000,
  });
}
