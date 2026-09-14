import { useEffect, useState } from 'react';
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

export const SEARCH_DEBOUNCE_MS = 450;

function createCancellationError() {
  const error = new Error('Search request was cancelled.');
  error.name = 'AbortError';
  return error;
}

function useDebouncedValue(value: string) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    if (value === debouncedValue) {
      return;
    }

    const timeout = setTimeout(
      () => setDebouncedValue(value),
      SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timeout);
  }, [debouncedValue, value]);

  return debouncedValue;
}

export function useSearchTitles(
  query: string,
  mediaType: SearchMediaType = 'all',
  page = 1,
) {
  const normalizedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(normalizedQuery);
  const isDebouncing = normalizedQuery !== debouncedQuery;

  const queryResult = useQuery({
    queryKey: searchTitlesQueryKey(normalizedQuery, mediaType, page),
    queryFn: async ({ signal }) => {
      if (signal.aborted) {
        throw createCancellationError();
      }

      const result = await searchTitles({
        query: normalizedQuery,
        mediaType,
        page,
        signal,
      });

      if (signal.aborted) {
        throw createCancellationError();
      }

      return result;
    },
    enabled:
      normalizedQuery.length >= 2 &&
      !isDebouncing &&
      normalizedQuery === debouncedQuery,
  });

  return {
    ...queryResult,
    isDebouncing,
  };
}
