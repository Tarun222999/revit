import { useQuery } from '@tanstack/react-query';

import {
  getMediaDetails,
  parseMediaRouteId,
} from '@/features/media/api/media-api';

export const mediaDetailsQueryKey = (routeId?: string) =>
  ['media', 'details', routeId] as const;

export function useMediaDetails(routeId?: string) {
  return useQuery({
    queryKey: mediaDetailsQueryKey(routeId),
    queryFn: () => getMediaDetails(parseMediaRouteId(routeId ?? '')),
    enabled: Boolean(routeId),
  });
}
