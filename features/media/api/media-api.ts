import { supabase } from '@/lib/supabase/client';
import type { MediaSource, NormalizedMediaItem } from '@/lib/media/types';

export type MediaDetailsInput =
  | {
      mediaItemId: string;
      source?: never;
      sourceId?: never;
    }
  | {
      mediaItemId?: never;
      source: MediaSource;
      sourceId: string;
    };

export type MediaDetailsResult = {
  item: NormalizedMediaItem;
};

export function createMediaRouteId(item: Pick<NormalizedMediaItem, 'id' | 'source' | 'sourceId'>) {
  if (item.id) {
    return item.id;
  }

  return `${item.source}:${item.sourceId}`;
}

export function parseMediaRouteId(routeId: string): MediaDetailsInput {
  const [source, ...sourceIdParts] = routeId.split(':');

  if ((source === 'tmdb' || source === 'igdb') && sourceIdParts.length > 0) {
    return {
      source,
      sourceId: sourceIdParts.join(':'),
    };
  }

  return {
    mediaItemId: routeId,
  };
}

export async function getMediaDetails(
  input: MediaDetailsInput,
): Promise<MediaDetailsResult> {
  const { data, error } = await supabase.functions.invoke<MediaDetailsResult>(
    'media-details',
    {
      body: input,
    },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No media details were returned.');
  }

  return data;
}
