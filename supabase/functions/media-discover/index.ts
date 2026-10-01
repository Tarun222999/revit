import { HttpError } from "../_shared/cors.ts";
import { createServiceClient, requireAuth } from "../_shared/auth.ts";
import { requireGamesFeatureEnabled } from "../_shared/app-capabilities.ts";
import { createIgdbClient } from "../_shared/igdb.ts";
import type { IgdbGame } from "../_shared/igdb-types.ts";
import { fetchTmdb } from "../_shared/tmdb.ts";
import {
  isLikelyAnime,
  normalizeTmdbMovie,
  normalizeTmdbTv,
  type NormalizedMediaItem,
  type TmdbMovieResult,
  type TmdbTvResult,
} from "../_shared/media-normalizers.ts";
import {
  buildIgdbDiscoverQuery,
  buildIgdbGamesByIdQuery,
  buildIgdbPopularityQuery,
  getRankedPopularityGameIds,
  igdbDiscoverTotalPages,
  normalizeIgdbDiscoverResults,
  orderGamesByPopularity,
  paginateTrendingGames,
  type IgdbPopularityPrimitive,
} from "./games-discover.ts";
import {
  createMediaDiscoverHandler,
  type DiscoverCacheRow,
  type DiscoverMediaType,
  type DiscoverMode,
  type DiscoverResponse,
} from "./media-discover-handler.ts";

type TmdbPagedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

type CacheRow = {
  response: unknown;
  expires_at: string;
};

const CACHE_TTL_MS: Record<DiscoverMode, number> = {
  trending: 3 * 60 * 60 * 1000,
  new_releases: 12 * 60 * 60 * 1000,
  top_rated: 24 * 60 * 60 * 1000,
};
const ANIME_TRENDING_PAGE_SCAN_LIMIT = 4;
const DISCOVER_PAGE_SIZE = 20;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function expiresAtFor(mode: DiscoverMode) {
  return new Date(Date.now() + CACHE_TTL_MS[mode]).toISOString();
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
  if (mode === "trending") {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbMovieResult>>(
      "/trending/movie/week",
      { language: "en-US", page },
    );

    return {
      results: dedupeMediaItems(normalizeMovieResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  if (mode === "new_releases") {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbMovieResult>>(
      "/movie/now_playing",
      { language: "en-US", page },
    );

    return {
      results: dedupeMediaItems(normalizeMovieResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  const response = await fetchTmdb<TmdbPagedResponse<TmdbMovieResult>>(
    "/movie/top_rated",
    { language: "en-US", page },
  );

  return {
    results: dedupeMediaItems(normalizeMovieResults(response.results)),
    totalPages: response.total_pages,
  };
}

async function fetchSeriesDiscover(mode: DiscoverMode, page: number) {
  if (mode === "trending") {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
      "/trending/tv/week",
      { language: "en-US", page },
    );

    return {
      results: dedupeMediaItems(normalizeSeriesResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  if (mode === "new_releases") {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
      "/tv/on_the_air",
      { language: "en-US", page },
    );

    return {
      results: dedupeMediaItems(normalizeSeriesResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
    "/tv/top_rated",
    { language: "en-US", page },
  );

  return {
    results: dedupeMediaItems(normalizeSeriesResults(response.results)),
    totalPages: response.total_pages,
  };
}

async function fetchAnimeDiscover(mode: DiscoverMode, page: number) {
  if (mode === "trending") {
    const startPage = (page - 1) * ANIME_TRENDING_PAGE_SCAN_LIMIT + 1;
    const scannedResponses = await Promise.all(
      Array.from({ length: ANIME_TRENDING_PAGE_SCAN_LIMIT }, (_, index) =>
        fetchTmdb<TmdbPagedResponse<TmdbTvResult>>("/trending/tv/week", {
          language: "en-US",
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
          Math.max(
            ...scannedResponses.map((response) => response.total_pages),
          ) / ANIME_TRENDING_PAGE_SCAN_LIMIT,
        ),
      ),
    };
  }

  if (mode === "new_releases") {
    const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
      "/discover/tv",
      {
        "first_air_date.lte": todayIsoDate(),
        language: "en-US",
        page,
        sort_by: "first_air_date.desc",
        with_genres: "16",
        with_origin_country: "JP",
        with_original_language: "ja",
      },
    );

    return {
      results: dedupeMediaItems(normalizeAnimeResults(response.results)),
      totalPages: response.total_pages,
    };
  }

  const response = await fetchTmdb<TmdbPagedResponse<TmdbTvResult>>(
    "/discover/tv",
    {
      language: "en-US",
      page,
      sort_by: "vote_average.desc",
      "vote_count.gte": 100,
      with_genres: "16",
      with_origin_country: "JP",
      with_original_language: "ja",
    },
  );

  return {
    results: dedupeMediaItems(normalizeAnimeResults(response.results)),
    totalPages: response.total_pages,
  };
}

async function fetchGameDiscover(mode: DiscoverMode, page: number) {
  const client = createIgdbClient();

  if (mode === "trending") {
    const primitives = await client.queryPopularityPrimitives<IgdbPopularityPrimitive>(
      buildIgdbPopularityQuery(),
    );
    const rankedGameIds = getRankedPopularityGameIds(primitives);
    const detailsQuery = buildIgdbGamesByIdQuery(rankedGameIds);
    if (!detailsQuery) {
      return { results: [], totalPages: 1 };
    }

    const games = await client.queryGames<IgdbGame>(detailsQuery);
    const eligible = normalizeIgdbDiscoverResults(
      mode,
      orderGamesByPopularity(games, rankedGameIds),
    );
    return paginateTrendingGames(eligible, page);
  }

  const games = await client.queryGames<IgdbGame>(
    buildIgdbDiscoverQuery(mode, page),
  );

  return {
    results: dedupeMediaItems(normalizeIgdbDiscoverResults(mode, games)),
    totalPages: igdbDiscoverTotalPages(page, games.length),
  };
}

async function fetchDiscoveryResults(
  mode: DiscoverMode,
  mediaType: DiscoverMediaType,
  page: number,
) {
  if (mediaType === "movie") {
    return fetchMovieDiscover(mode, page);
  }

  if (mediaType === "series") {
    return fetchSeriesDiscover(mode, page);
  }

  if (mediaType === "game") {
    return fetchGameDiscover(mode, page);
  }

  return fetchAnimeDiscover(mode, page);
}

async function readCachedResponse(
  mode: DiscoverMode,
  mediaType: DiscoverMediaType,
  page: number,
): Promise<DiscoverCacheRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("media_discovery_cache")
    .select("response, expires_at")
    .eq("mode", mode)
    .eq("media_type", mediaType)
    .eq("page", page)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new HttpError(500, "Unable to load discovery cache.");
  }

  if (!data) {
    return null;
  }

  const row = data as CacheRow;

  return {
    expiresAt: row.expires_at,
    response: row.response,
  };
}

async function writeCachedResponse(
  mode: DiscoverMode,
  mediaType: DiscoverMediaType,
  page: number,
  response: DiscoverResponse,
) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("media_discovery_cache")
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
        onConflict: "mode,media_type,page",
      },
    )
    .select("mode")
    .single();

  if (error) {
    console.error(error);
    throw new HttpError(500, "Unable to save discovery cache.");
  }
}

Deno.serve(
  createMediaDiscoverHandler({
    assertGamesEnabled: requireGamesFeatureEnabled,
    authenticate: requireAuth,
    fetchDiscovery: fetchDiscoveryResults,
    readCache: readCachedResponse,
    writeCache: writeCachedResponse,
  }),
);
