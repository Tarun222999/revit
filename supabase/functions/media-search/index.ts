import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { fetchTmdb } from '../_shared/tmdb.ts';
import {
  isLikelyAnime,
  normalizeTmdbMovie,
  normalizeTmdbTv,
  type NormalizedMediaItem,
  type TmdbMovieResult,
  type TmdbTvResult,
} from '../_shared/media-normalizers.ts';

type SearchMediaType = 'all' | 'movie' | 'series' | 'anime';

type MediaSearchRequest = {
  query?: unknown;
  mediaType?: unknown;
  page?: unknown;
};

type TmdbSearchResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

const SEARCH_MEDIA_TYPES = new Set<SearchMediaType>([
  'all',
  'movie',
  'series',
  'anime',
]);

function parsePage(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 1), 500);
}

function parseRequest(body: MediaSearchRequest) {
  if (typeof body.query !== 'string') {
    throw new HttpError(400, 'Search query is required.');
  }

  const query = body.query.trim();

  if (query.length < 2) {
    throw new HttpError(400, 'Search query must be at least 2 characters.');
  }

  const mediaType =
    typeof body.mediaType === 'string' &&
    SEARCH_MEDIA_TYPES.has(body.mediaType as SearchMediaType)
      ? (body.mediaType as SearchMediaType)
      : 'all';

  return {
    query,
    mediaType,
    page: parsePage(body.page),
  };
}

type NormalizedSearchResponse = {
  results: NormalizedMediaItem[];
  totalPages: number;
};

async function searchMovies(
  query: string,
  page: number,
): Promise<NormalizedSearchResponse> {
  const response = await fetchTmdb<TmdbSearchResponse<TmdbMovieResult>>(
    '/search/movie',
    {
      query,
      page,
      include_adult: false,
      language: 'en-US',
    },
  );

  return {
    results: response.results.map(normalizeTmdbMovie),
    totalPages: response.total_pages,
  };
}

async function searchTv(
  query: string,
  page: number,
  postFilter: { animeOnly?: boolean } = {},
): Promise<NormalizedSearchResponse> {
  const response = await fetchTmdb<TmdbSearchResponse<TmdbTvResult>>(
    '/search/tv',
    {
      query,
      page,
      include_adult: false,
      language: 'en-US',
    },
  );

  return {
    results: response.results
      .filter((result) => !postFilter.animeOnly || isLikelyAnime(result))
      .map((result) =>
        normalizeTmdbTv(result, { forceAnime: postFilter.animeOnly }),
      ),
    totalPages: response.total_pages,
  };
}

function sortResults(results: NormalizedMediaItem[]) {
  return [...results].sort((a, b) => {
    const aPopularity =
      typeof a.metadata.popularity === 'number' ? a.metadata.popularity : 0;
    const bPopularity =
      typeof b.metadata.popularity === 'number' ? b.metadata.popularity : 0;

    return bPopularity - aPopularity;
  });
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

    const body = (await request.json()) as MediaSearchRequest;
    const { query, mediaType, page } = parseRequest(body);

    let results: NormalizedMediaItem[] = [];
    let totalPages = 1;

    if (mediaType === 'movie') {
      const response = await searchMovies(query, page);
      results = response.results;
      totalPages = response.totalPages;
    } else if (mediaType === 'series') {
      const response = await searchTv(query, page);
      results = response.results;
      totalPages = response.totalPages;
    } else if (mediaType === 'anime') {
      const response = await searchTv(query, page, { animeOnly: true });
      results = response.results;
      totalPages = response.totalPages;
    } else {
      const [moviesResponse, tvResponse] = await Promise.all([
        searchMovies(query, page),
        searchTv(query, page),
      ]);

      results = sortResults([
        ...moviesResponse.results,
        ...tvResponse.results,
      ]);
      totalPages = Math.max(moviesResponse.totalPages, tvResponse.totalPages);
    }

    return jsonResponse({
      results,
      page,
      totalPages,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
