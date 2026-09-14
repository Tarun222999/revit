import { HttpError } from '../_shared/cors.ts';
import { createServiceClient, requireAuth } from '../_shared/auth.ts';
import { getAppCapabilities } from '../_shared/app-capabilities.ts';
import { fetchTmdb } from '../_shared/tmdb.ts';
import { createIgdbClient } from '../_shared/igdb.ts';
import { fetchNormalizedIgdbDetails } from '../_shared/igdb-details.ts';
import { createMediaDetailsHandler } from '../_shared/media-details-handler.ts';
import {
  fromMediaItemRow,
  type MediaItemRow,
  normalizeTmdbMovie,
  normalizeTmdbTv,
  toMediaItemRow,
  type MediaSource,
  type NormalizedMediaItem,
  type TmdbMovieResult,
  type TmdbTvResult,
} from '../_shared/media-normalizers.ts';

type ParsedSourceId = {
  kind: 'movie' | 'tv';
  tmdbId: string;
};

function parseTmdbSourceId(sourceId: string): ParsedSourceId {
  const [kind, tmdbId] = sourceId.split(':');

  if ((kind !== 'movie' && kind !== 'tv') || !tmdbId) {
    throw new HttpError(400, 'Invalid TMDB source id.');
  }

  return { kind, tmdbId };
}

async function fetchTmdbDetails(
  sourceId: string,
): Promise<NormalizedMediaItem> {
  const { kind, tmdbId } = parseTmdbSourceId(sourceId);

  if (kind === 'movie') {
    const movie = await fetchTmdb<TmdbMovieResult>(`/movie/${tmdbId}`, {
      language: 'en-US',
    });

    return normalizeTmdbMovie(movie);
  }

  const tv = await fetchTmdb<TmdbTvResult>(`/tv/${tmdbId}`, {
    language: 'en-US',
  });

  return normalizeTmdbTv(tv);
}

async function fetchIgdbDetails(
  sourceId: string,
): Promise<NormalizedMediaItem> {
  const client = createIgdbClient();
  return fetchNormalizedIgdbDetails(client, sourceId);
}

async function loadMediaItemById(mediaItemId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', mediaItemId)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Unable to load media details.');
  }

  if (!data) {
    throw new HttpError(404, 'Media item was not found.');
  }

  return fromMediaItemRow(data as MediaItemRow);
}

async function loadMediaItemBySourceId(source: MediaSource, sourceId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('source', source)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Unable to load media details.');
  }

  return data ? fromMediaItemRow(data as MediaItemRow) : null;
}

async function upsertMediaItem(item: NormalizedMediaItem) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('media_items')
    .upsert(toMediaItemRow(item), {
      onConflict: 'source,source_id',
    })
    .select('*')
    .single();

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Unable to save media details.');
  }

  return fromMediaItemRow(data as MediaItemRow);
}

const handler = createMediaDetailsHandler({
  fetchIgdbDetails,
  fetchTmdbDetails,
  gamesEnabled: () => getAppCapabilities().gamesEnabled,
  loadMediaItemById,
  loadMediaItemBySourceId,
  requireAuth,
  upsertMediaItem,
});

Deno.serve(handler);
