import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/cors.ts';
import { createServiceClient, requireAuth } from '../_shared/auth.ts';
import { fetchTmdb } from '../_shared/tmdb.ts';
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

type MediaDetailsRequest = {
  mediaItemId?: unknown;
  source?: unknown;
  sourceId?: unknown;
};

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

function parseRequest(body: MediaDetailsRequest) {
  if (typeof body.mediaItemId === 'string' && body.mediaItemId.trim()) {
    return {
      kind: 'mediaItemId' as const,
      mediaItemId: body.mediaItemId.trim(),
    };
  }

  if (body.source !== 'tmdb' || typeof body.sourceId !== 'string') {
    throw new HttpError(400, 'Media source and source id are required.');
  }

  return {
    kind: 'sourceId' as const,
    source: body.source as MediaSource,
    sourceId: body.sourceId.trim(),
  };
}

async function fetchTmdbDetails(sourceId: string): Promise<NormalizedMediaItem> {
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

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed.');
    }

    await requireAuth(request);

    const body = (await request.json()) as MediaDetailsRequest;
    const parsedRequest = parseRequest(body);

    if (parsedRequest.kind === 'mediaItemId') {
      const item = await loadMediaItemById(parsedRequest.mediaItemId);
      return jsonResponse({ item });
    }

    const item = await fetchTmdbDetails(parsedRequest.sourceId);
    const savedItem = await upsertMediaItem(item);

    return jsonResponse({ item: savedItem });
  } catch (error) {
    return errorResponse(error);
  }
});
