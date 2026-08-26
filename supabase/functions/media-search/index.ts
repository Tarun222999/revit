import { requireAuth } from '../_shared/auth.ts';
import { getAppCapabilities, requireGamesFeatureEnabled } from '../_shared/app-capabilities.ts';
import { createIgdbClient } from '../_shared/igdb.ts';
import { createMediaSearchHandler } from '../_shared/media-search-handler.ts';
import { fetchTmdb } from '../_shared/tmdb.ts';
import {
  filterTmdbTvSearchResults,
  normalizeTmdbMovie,
  normalizeTmdbTv,
  type TmdbMovieResult,
  type TmdbTvResult,
} from '../_shared/media-normalizers.ts';

type TmdbSearchResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

async function searchMovies(
  query: string,
  page: number,
): Promise<{ results: ReturnType<typeof normalizeTmdbMovie>[]; totalPages: number }> {
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
  mediaType: 'all' | 'series' | 'anime' = 'all',
): Promise<{ results: ReturnType<typeof normalizeTmdbTv>[]; totalPages: number }> {
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
    results: filterTmdbTvSearchResults(response.results, mediaType).map(
      (result) => normalizeTmdbTv(result, { forceAnime: mediaType === 'anime' }),
    ),
    totalPages: response.total_pages,
  };
}

Deno.serve(createMediaSearchHandler({
  createIgdbClient,
  gamesEnabled: () => getAppCapabilities().gamesEnabled,
  requireAuth,
  requireGamesEnabled: requireGamesFeatureEnabled,
  searchMovies,
  searchTv,
}));
