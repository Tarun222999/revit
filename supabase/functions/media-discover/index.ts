import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/cors.ts';
import { createServiceClient, requireAuth } from '../_shared/auth.ts';
import { fetchTmdb } from '../_shared/tmdb.ts';
import {
  isLikelyAnime,
  normalizeTmdbMovie,
  normalizeTmdbTv,
  type NormalizedMediaItem,
  type TmdbMovieResult,
  type TmdbTvResult,
} from '../_shared/media-normalizers.ts';

type DiscoverMode = 'trending' | 'new_releases' | 'top_rated';
type DiscoverMediaType = 'movie' | 'series' | 'anime';

type MediaDiscoverRequest = {
  mode?: unknown;
  mediaType?: unknown;
  page?: unknown;
};

type TmdbPagedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

type DiscoverResponse = {
  results: NormalizedMediaItem[];
  page: number;
  totalPages: number;
  cachedAt: string;
};

type CacheRow = {
  response: unknown;
  expires_at: string;
};

const DISCOVER_MODES = new Set<DiscoverMode>([
  'trending',
  'new_releases',
  'top_rated',
]);

const DISCOVER_MEDIA_TYPES = new Set<DiscoverMediaType>([
  'movie',
  'series',
  'anime',
]);

const CACHE_TTL_MS: Record<DiscoverMode, number> = {
  trending: 3 * 60 * 60 * 1000,
  new_releases: 12 * 60 * 60 * 1000,
  top_rated: 24 * 60 * 60 * 1000,
};
const ANIME_TRENDING_PAGE_SCAN_LIMIT = 4;
const DISCOVER_PAGE_SIZE = 20;

function parsePage(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 1), 500);
}

function parseRequest(body: MediaDiscoverRequest) {
  if (
    typeof body.mode !== 'string' ||
    !DISCOVER_MODES.has(body.mode as DiscoverMode)
  ) {
    throw new HttpError(400, 'A valid discovery mode is required.');
  }

  if (
    typeof body.mediaType !== 'string' ||
    !DISCOVER_MEDIA_TYPES.has(body.mediaType as DiscoverMediaType)
  ) {
    throw new HttpError(400, 'A valid discovery media type is required.');
  }

  return {
    mode: body.mode as DiscoverMode,
    mediaType: body.mediaType as DiscoverMediaType,
    page: parsePage(body.page),
  };
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function expiresAtFor(mode: DiscoverMode) {
  return new Date(Date.now() + CACHE_TTL_MS[mode]).toISOString();
}

function isDiscoverResponse(value: unknown): value is DiscoverResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as Partial<DiscoverResponse>;

  return (
    Array.isArray(response.results) &&
    typeof response.page === 'number' &&
    typeof response.totalPages === 'number' &&
    typeof response.cachedAt === 'string'
  );
}

function normalizeMovieResults(results: TmdbMovieResult[]) {
  return results.map(normalizeTmdbMovie);
}

function normalizeSeriesResults(results: TmdbTvResult[]) {
  return results
    .filter((result) => !isLikelyAnime(result))
    .map((result) => normalizeTmdbTv(result));
}

function normalizeAnimeResults(results: TmdbTvResult[]) {
  return results.map((result) => normalizeTmdbTv(result, { forceAnime: true }));
}

function dedupeMediaItems(items: NormalizedMediaItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.source}:${item.sourceId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function fetchMovieDiscover(mode: DiscoverMode, page: number) {
  if (mode === 'trending') {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbMovieResult>>(
      '/trending/movie/week',
      { language: 'en-US', page },
    );

    return {
      results: dedupeMediaItems(normalizeMovieResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  if (mode === 'new_releases') {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbMovieResult>>(
      '/movie/now_playing',
      { language: 'en-US', page },
    );

    return {
      results: dedupeMediaItems(normalizeMovieResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  const response = await fetchTmdb<TmdbPagedResponse<TmdbMovieResult>>(
    '/movie/top_rated',
    { language: 'en-US', page },
  );

  return {
    results: dedupeMediaItems(normalizeMovieResults(response.results)),
    totalPages: response.total_pages,
  };
}

async function fetchSeriesDiscover(mode: DiscoverMode, page: number) {
  if (mode === 'trending') {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
      '/trending/tv/week',
      { language: 'en-US', page },
    );

    return {
      results: dedupeMediaItems(normalizeSeriesResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  if (mode === 'new_releases') {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
      '/tv/on_the_air',
      { language: 'en-US', page },
    );

    return {
      results: dedupeMediaItems(normalizeSeriesResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
    '/tv/top_rated',
    { language: 'en-US', page },
  );

  return {
    results: dedupeMediaItems(normalizeSeriesResults(response.results)),
    totalPages: response.total_pages,
  };
}

async function fetchAnimeDiscover(mode: DiscoverMode, page: number) {
  if (mode === 'trending') {
    const startPage = (page - 1) * ANIME_TRENDING_PAGE_SCAN_LIMIT + 1;
    const scannedResponses = await Promise.all(
      Array.from({ length: ANIME_TRENDING_PAGE_SCAN_LIMIT }, (_, index) =>
        fetchTmdb<TmdbPagedResponse<TmdbTvResult>>('/trending/tv/week', {
          language: 'en-US',
          page: startPage + index,
        }),
      ),
    );
    const animeResults = scannedResponses
      .flatMap((response) => response.results)
      .filter(isLikelyAnime)
      .slice(0, DISCOVER_PAGE_SIZE);

    return {
      results: dedupeMediaItems(normalizeAnimeResults(animeResults)),
      totalPages: Math.max(
        1,
        Math.floor(
          Math.max(...scannedResponses.map((response) => response.total_pages)) /
            ANIME_TRENDING_PAGE_SCAN_LIMIT,
        ),
      ),
    };
  }

  if (mode === 'new_releases') {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
      '/discover/tv',
      {
        'first_air_date.lte': todayIsoDate(),
        language: 'en-US',
        page,
        sort_by: 'first_air_date.desc',
        with_genres: '16',
        with_origin_country: 'JP',
        with_original_language: 'ja',
      },
    );

    return {
      results: dedupeMediaItems(normalizeAnimeResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
    '/discover/tv',
    {
      language: 'en-US',
      page,
      sort_by: 'vote_average.desc',
      'vote_count.gte': 100,
      with_genres: '16',
      with_origin_country: 'JP',
      with_original_language: 'ja',
    },
  );

  return {
    results: dedupeMediaItems(normalizeAnimeResults(response.results)),
    totalPages: response.total_pages,
  };
}

async function fetchDiscoveryResults(
  mode: DiscoverMode,
  mediaType: DiscoverMediaType,
  page: number,
) {
  if (mediaType === 'movie') {
    return fetchMovieDiscover(mode, page);
  }

  if (mediaType === 'series') {
    return fetchSeriesDiscover(mode, page);
  }

  return fetchAnimeDiscover(mode, page);
}

async function readCachedResponse(
  mode: DiscoverMode,
  mediaType: DiscoverMediaType,
  page: number,
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('media_discovery_cache')
    .select('response, expires_at')
    .eq('mode', mode)
    .eq('media_type', mediaType)
    .eq('page', page)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Unable to load discovery cache.');
  }

  if (!data) {
    return null;
  }

  const row = data as CacheRow;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return isDiscoverResponse(row.response) ? row.response : null;
}

async function writeCachedResponse(
  mode: DiscoverMode,
  mediaType: DiscoverMediaType,
  page: number,
  response: DiscoverResponse,
) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('media_discovery_cache')
    .upsert(
      {
        cached_at: response.cachedAt,
        expires_at: expiresAtFor(mode),
        media_type: mediaType,
        mode,
        page,
        response,
      },
      {
        onConflict: 'mode,media_type,page',
      },
    )
    .select('mode')
    .single();

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Unable to save discovery cache.');
  }
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

    const body = (await request.json()) as MediaDiscoverRequest;
    const { mode, mediaType, page } = parseRequest(body);
    const cachedResponse = await readCachedResponse(mode, mediaType, page);

    if (cachedResponse) {
      return jsonResponse(cachedResponse);
    }

    const discovery = await fetchDiscoveryResults(mode, mediaType, page);
    const response: DiscoverResponse = {
      cachedAt: new Date().toISOString(),
      page,
      results: discovery.results,
      totalPages: discovery.totalPages,
    };

    await writeCachedResponse(mode, mediaType, page, response);

    return jsonResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
});
