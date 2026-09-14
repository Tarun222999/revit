import {
  evaluateIgdbCatalogEligibility,
  IGDB_CATALOG_POLICY_VERSION,
} from '../_shared/igdb-catalog-policy.ts';
import { normalizeIgdbGame } from '../_shared/igdb-normalizer.ts';
import type { IgdbGame } from '../_shared/igdb-types.ts';

export const IGDB_DISCOVER_PAGE_SIZE = 20;
export const IGDB_TOP_RATED_MINIMUM_RATING_COUNT = 50;
export const IGDB_TRENDING_CANDIDATE_LIMIT = 500;
export const IGDB_TRENDING_POPULARITY_TYPE = 1;

export type IgdbDiscoverMode = "trending" | "new_releases" | "top_rated";

/**
 * The field expansion deliberately supplies everything that the shared
 * normalizer and catalog policy need. A non-Trending Games rail/page uses one
 * provider request on a cache miss. Trending uses one PopScore candidate
 * request followed by one game-details request.
 */
const IGDB_DISCOVER_FIELDS = [
  "id",
  "name",
  "slug",
  "summary",
  "storyline",
  "first_release_date",
  "cover.image_id",
  "cover.url",
  "artworks.image_id",
  "artworks.url",
  "screenshots.image_id",
  "screenshots.url",
  "genres.name",
  "platforms.name",
  "platforms.abbreviation",
  "game_type.type",
  "game_status.status",
  "themes",
  "version_parent",
  "rating",
  "aggregated_rating",
  "total_rating",
  "rating_count",
  "aggregated_rating_count",
  "total_rating_count",
  "age_ratings.organization.name",
  "age_ratings.rating_category.rating",
  "age_ratings.rating_content_descriptions.description",
].join(",");

function pageOffset(page: number) {
  return (page - 1) * IGDB_DISCOVER_PAGE_SIZE;
}

function baseWhereClause() {
  // Current table-backed relations retain the documented legacy numeric IDs.
  // Missing status remains eligible; every returned row is still evaluated by
  // the shared post-fetch policy before normalization or caching.
  return "game_type = (0,8,9) & (game_status = null | game_status = (0,2,3,4,5)) & version_parent = null & themes != (42)";
}

export function buildIgdbPopularityQuery() {
  return `fields game_id,value,popularity_type; where popularity_type = ${IGDB_TRENDING_POPULARITY_TYPE}; sort value desc; limit ${IGDB_TRENDING_CANDIDATE_LIMIT}; offset 0;`;
}

export type IgdbPopularityPrimitive = {
  game_id?: number | null;
  popularity_type?: number | null;
  value?: number | null;
};

export function getRankedPopularityGameIds(
  primitives: IgdbPopularityPrimitive[],
) {
  const bestValueByGame = new Map<number, number>();

  for (const primitive of primitives) {
    if (
      primitive.popularity_type !== IGDB_TRENDING_POPULARITY_TYPE ||
      !Number.isSafeInteger(primitive.game_id) ||
      (primitive.game_id ?? 0) <= 0 ||
      typeof primitive.value !== "number" ||
      !Number.isFinite(primitive.value)
    ) {
      continue;
    }

    const gameId = primitive.game_id as number;
    bestValueByGame.set(
      gameId,
      Math.max(bestValueByGame.get(gameId) ?? Number.NEGATIVE_INFINITY, primitive.value),
    );
  }

  return [...bestValueByGame.entries()]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .map(([gameId]) => gameId)
    .slice(0, IGDB_TRENDING_CANDIDATE_LIMIT);
}

export function buildIgdbGamesByIdQuery(gameIds: number[]) {
  if (gameIds.length === 0) {
    return null;
  }

  return `fields ${IGDB_DISCOVER_FIELDS}; where id = (${gameIds.join(",")}) & ${baseWhereClause()}; limit ${Math.min(gameIds.length, IGDB_TRENDING_CANDIDATE_LIMIT)};`;
}

export function buildIgdbDiscoverQuery(
  mode: Exclude<IgdbDiscoverMode, "trending">,
  page: number,
) {
  const pagination = `limit ${IGDB_DISCOVER_PAGE_SIZE}; offset ${pageOffset(page)};`;
  const where = baseWhereClause();

  if (mode === "new_releases") {
    const nowSeconds = Math.floor(Date.now() / 1000);
    // One provider call: compact cards use first_release_date, while a later
    // detail surface may expand platform- and region-specific release data.
    return `fields ${IGDB_DISCOVER_FIELDS}; where ${where} & first_release_date != null & first_release_date <= ${nowSeconds}; sort first_release_date desc; ${pagination}`;
  }

  // total_rating is the approved provider score. Require enough votes to
  // avoid a handful of early ratings dominating an app-wide shelf.
  return `fields ${IGDB_DISCOVER_FIELDS}; where ${where} & total_rating != null & total_rating_count >= ${IGDB_TOP_RATED_MINIMUM_RATING_COUNT}; sort total_rating desc; ${pagination}`;
}

export function orderGamesByPopularity(
  games: IgdbGame[],
  rankedGameIds: number[],
) {
  const gameById = new Map(games.map((game) => [game.id, game]));
  return rankedGameIds.flatMap((gameId) => {
    const game = gameById.get(gameId);
    return game ? [game] : [];
  });
}

export function paginateTrendingGames<T>(items: T[], page: number) {
  const start = pageOffset(page);
  return {
    results: items.slice(start, start + IGDB_DISCOVER_PAGE_SIZE),
    totalPages: Math.max(1, Math.ceil(items.length / IGDB_DISCOVER_PAGE_SIZE)),
  };
}

function ratingCount(game: IgdbGame) {
  const totalRatingCount = (game as IgdbGame & { total_rating_count?: unknown })
    .total_rating_count;
  const counts = [
    totalRatingCount,
    game.rating_count,
    game.aggregated_rating_count,
  ];
  const numericCounts = counts.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  return numericCounts.length > 0 ? Math.max(...numericCounts) : 0;
}

function isTopRatedEligible(game: IgdbGame) {
  return (
    typeof game.total_rating === "number" &&
    Number.isFinite(game.total_rating) &&
    ratingCount(game) >= IGDB_TOP_RATED_MINIMUM_RATING_COUNT
  );
}

export function normalizeIgdbDiscoverResults(
  mode: IgdbDiscoverMode,
  games: IgdbGame[],
) {
  const seen = new Set<string>();

  return games.flatMap((game) => {
    if (!evaluateIgdbCatalogEligibility(game).eligible) {
      return [];
    }

    if (mode === "top_rated" && !isTopRatedEligible(game)) {
      return [];
    }

    const normalized = normalizeIgdbGame(game);
    if (!normalized || seen.has(normalized.sourceId)) {
      return [];
    }

    seen.add(normalized.sourceId);
    return [normalized];
  });
}

export function igdbDiscoverTotalPages(
  page: number,
  providerResultCount: number,
) {
  // IGDB's games endpoint does not return a total count for regular queries.
  // Preserve incremental browsing without pretending a known finite count;
  // an under-full provider page is the terminal page.
  return providerResultCount < IGDB_DISCOVER_PAGE_SIZE ? page : 500;
}

export { IGDB_CATALOG_POLICY_VERSION };
