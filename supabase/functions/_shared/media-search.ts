import {
  evaluateIgdbCatalogEligibility,
  IGDB_EROTIC_THEME_ID,
  IGDB_INCLUDED_GAME_STATUS_IDS,
  IGDB_INCLUDED_GAME_TYPE_IDS,
} from './igdb-catalog-policy.ts';
import { normalizeIgdbGame } from './igdb-normalizer.ts';
import type { IgdbGame } from './igdb-types.ts';
import type {
  NormalizedMediaItem,
  TmdbMovieResult,
  TmdbTvResult,
} from './media-normalizers.ts';

export type SearchMediaType = 'all' | 'movie' | 'series' | 'anime' | 'game';

export type NormalizedSearchResponse = {
  results: NormalizedMediaItem[];
  totalPages: number;
};

export type MediaSearchResponse = NormalizedSearchResponse & {
  /** True only when an enabled IGDB request failed during an All search. */
  gamesUnavailable?: boolean;
};

export type ParsedMediaSearchRequest = {
  query: string;
  mediaType: SearchMediaType;
  page: number;
};

export type MediaSearchDependencies = {
  gamesEnabled: () => boolean;
  requireGamesEnabled: () => void;
  searchGames: (query: string) => Promise<IgdbGame[]>;
  searchMovies: (query: string, page: number) => Promise<NormalizedSearchResponse>;
  searchTv: (
    query: string,
    page: number,
    mediaType: 'all' | 'series' | 'anime',
  ) => Promise<NormalizedSearchResponse>;
};

const IGDB_SEARCH_FIELDS = [
  'id',
  'name',
  'slug',
  'summary',
  'storyline',
  'first_release_date',
  'cover.image_id',
  'cover.url',
  'artworks.image_id',
  'artworks.url',
  'screenshots.image_id',
  'screenshots.url',
  'genres.name',
  'platforms.name',
  'platforms.abbreviation',
  'age_ratings.organization.name',
  'age_ratings.rating_category.rating',
  'age_ratings.synopsis',
  'age_ratings.rating_content_descriptions.description',
  'game_type.type',
  'game_status.status',
  'themes.id',
  'version_parent.id',
  'rating',
  'aggregated_rating',
  'total_rating',
  'rating_count',
  'aggregated_rating_count',
] as const;

function escapeIgdbSearchTerm(query: string) {
  return query.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * IGDB orders `search` results by its own similarity ranking. Do not add an
 * order clause or a local sort: Games-only results must retain that relevance.
 */
export function buildIgdbSearchQuery(query: string) {
  const allowedTypes = IGDB_INCLUDED_GAME_TYPE_IDS.join(',');
  const allowedStatuses = IGDB_INCLUDED_GAME_STATUS_IDS.join(',');

  return [
    `search "${escapeIgdbSearchTerm(query)}";`,
    `fields ${IGDB_SEARCH_FIELDS.join(',')};`,
    `where game_type = (${allowedTypes}) & ` +
    `(game_status = null | game_status = (${allowedStatuses})) & ` +
    `version_parent = null & themes != (${IGDB_EROTIC_THEME_ID});`,
    'limit 20;',
  ].join(' ');
}

function sortTmdbResults(results: NormalizedMediaItem[]) {
  return [...results].sort((a, b) => {
    const aPopularity =
      typeof a.metadata.popularity === 'number' ? a.metadata.popularity : 0;
    const bPopularity =
      typeof b.metadata.popularity === 'number' ? b.metadata.popularity : 0;

    return bPopularity - aPopularity;
  });
}

/** Apply the one shared catalog policy before a game leaves the provider edge. */
export function normalizeSearchGames(games: IgdbGame[]) {
  return games.flatMap((game) => {
    if (!evaluateIgdbCatalogEligibility(game).eligible) {
      return [];
    }

    const normalized = normalizeIgdbGame(game);
    return normalized ? [normalized] : [];
  });
}

/**
 * Composes one app-facing Search invocation. TMDB retains its established
 * popularity ordering; IGDB is always appended after it, with no cross-source
 * comparison of incompatible ranking signals.
 */
export async function executeMediaSearch(
  request: ParsedMediaSearchRequest,
  dependencies: MediaSearchDependencies,
): Promise<MediaSearchResponse> {
  const { mediaType, page, query } = request;

  if (mediaType === 'movie') {
    return dependencies.searchMovies(query, page);
  }

  if (mediaType === 'series' || mediaType === 'anime') {
    return dependencies.searchTv(query, page, mediaType);
  }

  if (mediaType === 'game') {
    dependencies.requireGamesEnabled();
    const games = await dependencies.searchGames(query);
    return { results: normalizeSearchGames(games), totalPages: 1 };
  }

  const gamesSearch = dependencies.gamesEnabled()
    ? dependencies
        .searchGames(query)
        .then((games) => ({ games: normalizeSearchGames(games), unavailable: false }))
        .catch(() => ({ games: [], unavailable: true }))
    : Promise.resolve({ games: [], unavailable: false });
  const [movies, tv, games] = await Promise.all([
    dependencies.searchMovies(query, page),
    dependencies.searchTv(query, page, 'all'),
    gamesSearch,
  ]);

  return {
    results: [...sortTmdbResults([...movies.results, ...tv.results]), ...games.games],
    totalPages: Math.max(movies.totalPages, tv.totalPages),
    ...(games.unavailable ? { gamesUnavailable: true } : {}),
  };
}

// Keep the result types part of this edge boundary's public contract.
export type { TmdbMovieResult, TmdbTvResult };
