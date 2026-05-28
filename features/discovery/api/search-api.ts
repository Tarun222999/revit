import { supabase } from '@/lib/supabase/client';
import type { MediaType, NormalizedMediaItem } from '@/lib/media/types';

export type SearchMediaType = 'all' | Exclude<MediaType, 'game'>;

export type SearchTitlesInput = {
  query: string;
  mediaType?: SearchMediaType;
  page?: number;
};

export type SearchTitlesResult = {
  results: NormalizedMediaItem[];
  page: number;
  totalPages: number;
};

export async function searchTitles({
  query,
  mediaType = 'all',
  page = 1,
}: SearchTitlesInput): Promise<SearchTitlesResult> {
  const { data, error } = await supabase.functions.invoke<SearchTitlesResult>(
    'media-search',
    {
      body: {
        query,
        mediaType,
        page,
      },
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
