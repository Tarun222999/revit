import { useQuery } from '@tanstack/react-query';

import {
  searchTitles,
  type SearchMediaType,
} from '@/features/discovery/api/search-api';

export const searchTitlesQueryKey = (
  query: string,
  mediaType: SearchMediaType,
  page: number,
) => ['media', 'search', query.trim().toLowerCase(), mediaType, page] as const;

export function useSearchTitles(
  query: string,
  mediaType: SearchMediaType = 'all',
  page = 1,
) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: searchTitlesQueryKey(normalizedQuery, mediaType, page),
    queryFn: () =>
      searchTitles({
        query: normalizedQuery,
        mediaType,
        page,
      }),
    enabled: normalizedQuery.length >= 2,
  });
}
