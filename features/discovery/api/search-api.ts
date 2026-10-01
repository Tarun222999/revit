import { supabase } from '@/lib/supabase/client';
import type { MediaType, NormalizedMediaItem } from '@/lib/media/types';

export type SearchMediaType = 'all' | MediaType;

export type SearchTitlesInput = {
  query: string;
  mediaType?: SearchMediaType;
  page?: number;
  signal?: AbortSignal;
};

export type SearchTitlesResult = {
  results: NormalizedMediaItem[];
  page: number;
  totalPages: number;
  /** All searches remain useful when the optional Games provider is down. */
  gamesUnavailable?: boolean;
};

export async function searchTitles({
  query,
  mediaType = 'all',
  page = 1,
  signal,
}: SearchTitlesInput): Promise<SearchTitlesResult> {
  const { data, error } = await supabase.functions.invoke<SearchTitlesResult>(
    'media-search',
    {
      body: {
        query,
        mediaType,
        page,
      },
      signal,
    },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No search results were returned.');
  }

  return data;
}
