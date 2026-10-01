import { useQuery } from '@tanstack/react-query';

import { getMediaTrailer } from '@/features/media/api/media-api';

const TRAILER_STALE_TIME_MS = 24 * 60 * 60 * 1000;

export const mediaTrailerQueryKey = (sourceId?: string) =>
  ['media', 'trailer', sourceId] as const;

export function useMediaTrailer(sourceId?: string) {
  return useQuery({
    queryKey: mediaTrailerQueryKey(sourceId),
    queryFn: () =>
      getMediaTrailer({ source: 'tmdb', sourceId: sourceId ?? '' }),
    enabled: Boolean(sourceId),
    staleTime: TRAILER_STALE_TIME_MS,
  });
}
