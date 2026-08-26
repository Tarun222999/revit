type IgdbGameFixture = {
  game_status?: { status: string };
  game_type?: { type: string };
  id: number;
  name: string;
  rating_count?: number;
  themes?: number[];
  total_rating?: number;
  total_rating_count?: number;
  version_parent?: number | null;
};

type NormalizedDiscoverItem = {
  mediaType: string;
  source: string;
  sourceId: string;
  title: string;
};

function loadGamesDiscover() {
  // Runtime loading keeps the app TypeScript project separate from Deno imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../supabase/functions/media-discover/games-discover") as {
    buildIgdbDiscoverQuery: (mode: "new_releases" | "top_rated", page: number) => string;
    buildIgdbGamesByIdQuery: (gameIds: number[]) => string | null;
    buildIgdbPopularityQuery: () => string;
    getRankedPopularityGameIds: (primitives: Array<{
      game_id?: number | null;
      popularity_type?: number | null;
      value?: number | null;
    }>) => number[];
    igdbDiscoverTotalPages: (page: number, providerResultCount: number) => number;
    IGDB_CATALOG_POLICY_VERSION: string;
    IGDB_DISCOVER_PAGE_SIZE: number;
    IGDB_TOP_RATED_MINIMUM_RATING_COUNT: number;
    normalizeIgdbDiscoverResults: (
      mode: "trending" | "new_releases" | "top_rated",
      games: IgdbGameFixture[],
    ) => NormalizedDiscoverItem[];
    orderGamesByPopularity: (
      games: IgdbGameFixture[],
      rankedGameIds: number[],
    ) => IgdbGameFixture[];
    paginateTrendingGames: <T>(
      items: T[],
      page: number,
    ) => { results: T[]; totalPages: number };
  };
}

function loadDiscoverCachePolicy() {
  // Runtime loading keeps the app TypeScript project separate from Deno imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../supabase/functions/media-discover/discover-cache-policy") as {
    isCachedDiscoverResponse: (value: unknown) => boolean;
    isUsableDiscoverCache: (
      mediaType: "movie" | "series" | "anime" | "game",
      expiresAt: string,
      response: {
        cachedAt: string;
        page: number;
        policyVersion?: string;
        results: unknown[];
        totalPages: number;
      },
      now?: number,
    ) => boolean;
  };
}

function loadMediaDiscoverHandler() {
  // Runtime loading keeps the app TypeScript project separate from Deno imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../supabase/functions/media-discover/media-discover-handler") as {
    createMediaDiscoverHandler: (
      dependencies: Record<string, unknown>,
    ) => (request: Request) => Promise<Response>;
  };
}

const {
  buildIgdbDiscoverQuery,
  buildIgdbGamesByIdQuery,
  buildIgdbPopularityQuery,
  getRankedPopularityGameIds,
  igdbDiscoverTotalPages,
  IGDB_CATALOG_POLICY_VERSION,
  IGDB_DISCOVER_PAGE_SIZE,
  IGDB_TOP_RATED_MINIMUM_RATING_COUNT,
  normalizeIgdbDiscoverResults,
  orderGamesByPopularity,
  paginateTrendingGames,
} = loadGamesDiscover();
const { isCachedDiscoverResponse, isUsableDiscoverCache } =
  loadDiscoverCachePolicy();
const { createMediaDiscoverHandler } = loadMediaDiscoverHandler();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { IgdbProviderError } = require("../supabase/functions/_shared/provider-errors") as {
  IgdbProviderError: new (
    code: "igdb_rate_limited",
    retryAfterMs?: number,
  ) => Error;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { HttpError } = require("../supabase/functions/_shared/cors") as {
  HttpError: new (status: number, message: string, code?: string) => Error;
};

const eligibleGame = {
  game_status: { status: "released" },
  game_type: { type: "main_game" },
  id: 42,
  name: "Revit Game",
  rating_count: 100,
  themes: [],
  total_rating: 91,
  total_rating_count: 100,
  version_parent: null,
} satisfies IgdbGameFixture;

describe("IGDB Discover query mapping", () => {
  it("maps Trending to Revit’s approved popularity ordering", () => {
    const query = buildIgdbPopularityQuery();

    expect(query).toContain("fields game_id,value,popularity_type");
    expect(query).toContain("where popularity_type = 1");
    expect(query).toContain("sort value desc");
    expect(query).toContain("limit 500");
  });

  it("resolves PopScore candidates with all provider-side policy predicates", () => {
    const query = buildIgdbGamesByIdQuery([42, 7]);

    expect(query).toContain("id = (42,7)");
    expect(query).toContain("game_type = (0,8,9)");
    expect(query).toContain(
      "(game_status = null | game_status = (0,2,3,4,5))",
    );
    expect(query).toContain("version_parent = null");
    expect(query).toContain("themes != (42)");
  });

  it("maps New Releases to first release date ordering", () => {
    const query = buildIgdbDiscoverQuery("new_releases", 1);

    expect(query).toContain("first_release_date != null");
    expect(query).toContain("sort first_release_date desc");
    expect(query).toContain("game_type.type");
    expect(query).toContain("game_status.status");
    expect(query).toContain("game_type = (0,8,9)");
    expect(query).toContain("version_parent = null");
  });

  it("maps Top Rated to total rating with a rating-count safeguard", () => {
    const query = buildIgdbDiscoverQuery("top_rated", 1);

    expect(query).toContain("total_rating != null");
    expect(query).toContain(
      `total_rating_count >= ${IGDB_TOP_RATED_MINIMUM_RATING_COUNT}`,
    );
    expect(query).toContain("sort total_rating desc");
  });
});

describe("IGDB Discover normalization and catalog policy", () => {
  it("consumes the canonical IGDB normalizer and its collision-safe identity", () => {
    expect(normalizeIgdbDiscoverResults("trending", [eligibleGame])).toEqual([
      expect.objectContaining({
        mediaType: "game",
        source: "igdb",
        sourceId: "42",
        title: "Revit Game",
      }),
    ]);
  });

  it("filters policy-ineligible records before a public response", () => {
    const eroticGame = {
      ...eligibleGame,
      id: 43,
      themes: [42],
    };

    expect(normalizeIgdbDiscoverResults("trending", [eroticGame])).toEqual([]);
  });

  it("applies the rating-count safeguard after a provider response too", () => {
    const lowVoteGame = {
      ...eligibleGame,
      rating_count: 2,
      total_rating_count: 2,
    };

    expect(normalizeIgdbDiscoverResults("top_rated", [lowVoteGame])).toEqual(
      [],
    );
  });

  it("deduplicates games by canonical IGDB source identity", () => {
    expect(
      normalizeIgdbDiscoverResults("trending", [eligibleGame, eligibleGame]),
    ).toHaveLength(1);
  });

  it("uses the policy version to identify valid game cache entries", () => {
    expect(IGDB_CATALOG_POLICY_VERSION).toBe("games-catalog-v1");
  });
});

describe("IGDB Discover pagination", () => {
  it("stops on an under-full provider response and otherwise supports browsing", () => {
    expect(igdbDiscoverTotalPages(3, IGDB_DISCOVER_PAGE_SIZE - 1)).toBe(3);
    expect(igdbDiscoverTotalPages(3, IGDB_DISCOVER_PAGE_SIZE)).toBe(500);
  });

  it("preserves PopScore order after resolving unordered game details", () => {
    const rankedIds = getRankedPopularityGameIds([
      { game_id: 42, popularity_type: 1, value: 0.6 },
      { game_id: 7, popularity_type: 1, value: 0.9 },
      { game_id: 13, popularity_type: 2, value: 1 },
    ]);
    const ordered = orderGamesByPopularity(
      [eligibleGame, { ...eligibleGame, id: 7, name: "First" }],
      rankedIds,
    );

    expect(rankedIds).toEqual([7, 42]);
    expect(ordered.map((game) => game.id)).toEqual([7, 42]);
  });

  it("filters the full candidate pool before slicing page one", () => {
    const excluded = Array.from({ length: 20 }, (_, index) => ({
      ...eligibleGame,
      id: 100 + index,
      themes: [42],
    }));
    const eligible = Array.from({ length: 21 }, (_, index) => ({
      ...eligibleGame,
      id: 200 + index,
    }));
    const normalized = normalizeIgdbDiscoverResults("trending", [
      ...excluded,
      ...eligible,
    ]);

    expect(paginateTrendingGames(normalized, 1).results).toHaveLength(20);
    expect(paginateTrendingGames(normalized, 2).results).toHaveLength(1);
  });
});

describe("IGDB Discover cache policy", () => {
  const cachedGameResponse = {
    cachedAt: "2026-08-24T00:00:00.000Z",
    policyVersion: IGDB_CATALOG_POLICY_VERSION,
    page: 1,
    results: [],
    totalPages: 1,
  };

  it("accepts a fresh, policy-current game cache hit without provider work", () => {
    expect(isCachedDiscoverResponse(cachedGameResponse)).toBe(true);
    expect(
      isUsableDiscoverCache(
        "game",
        "2026-08-24T04:00:00.000Z",
        cachedGameResponse,
        Date.parse("2026-08-24T01:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("turns stale or old-policy game caches into a cache miss", () => {
    expect(
      isUsableDiscoverCache(
        "game",
        "2026-08-24T00:30:00.000Z",
        cachedGameResponse,
        Date.parse("2026-08-24T01:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      isUsableDiscoverCache(
        "game",
        "2026-08-24T04:00:00.000Z",
        { ...cachedGameResponse, policyVersion: "old-policy" },
        Date.parse("2026-08-24T01:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("media-discover handler", () => {
  const now = Date.parse("2026-08-24T01:00:00.000Z");
  const currentCache = {
    expiresAt: "2026-08-24T04:00:00.000Z",
    response: {
      cachedAt: "2026-08-24T00:00:00.000Z",
      page: 1,
      policyVersion: IGDB_CATALOG_POLICY_VERSION,
      results: [],
      totalPages: 1,
    },
  };

  function createHandlerDependencies(overrides: Record<string, unknown> = {}) {
    return {
      assertGamesEnabled: jest.fn(),
      authenticate: jest.fn().mockResolvedValue(undefined),
      fetchDiscovery: jest.fn().mockResolvedValue({
        results: [],
        totalPages: 1,
      }),
      now: () => now,
      readCache: jest.fn().mockResolvedValue(null),
      writeCache: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function gameRequest(body: Record<string, unknown> = {}) {
    return new Request("https://example.test/media-discover", {
      body: JSON.stringify({
        mediaType: "game",
        mode: "trending",
        page: 1,
        ...body,
      }),
      method: "POST",
    });
  }

  it("rejects invalid mode and media-type requests", async () => {
    const dependencies = createHandlerDependencies();
    const handler = createMediaDiscoverHandler(dependencies);

    const invalidMode = await handler(gameRequest({ mode: "popular" }));
    const invalidType = await handler(gameRequest({ mediaType: "book" }));

    expect(invalidMode.status).toBe(400);
    expect(invalidType.status).toBe(400);
    expect(dependencies.readCache).not.toHaveBeenCalled();
    expect(dependencies.fetchDiscovery).not.toHaveBeenCalled();
  });

  it("checks feature-off before cache or provider work", async () => {
    const disabled = new HttpError(
      503,
      "Games are temporarily unavailable.",
      "games_feature_disabled",
    );
    const dependencies = createHandlerDependencies({
      assertGamesEnabled: jest.fn(() => {
        throw disabled;
      }),
    });
    const response = await createMediaDiscoverHandler(dependencies)(gameRequest());

    expect(response.status).toBe(503);
    expect(dependencies.readCache).not.toHaveBeenCalled();
    expect(dependencies.fetchDiscovery).not.toHaveBeenCalled();
  });

  it("returns a current cache hit with zero IGDB/provider work", async () => {
    const dependencies = createHandlerDependencies({
      readCache: jest.fn().mockResolvedValue(currentCache),
    });
    const response = await createMediaDiscoverHandler(dependencies)(gameRequest());

    expect(response.status).toBe(200);
    expect(dependencies.fetchDiscovery).not.toHaveBeenCalled();
    expect(dependencies.writeCache).not.toHaveBeenCalled();
  });

  it("regenerates a cache entry with an old policy version", async () => {
    const dependencies = createHandlerDependencies({
      readCache: jest.fn().mockResolvedValue({
        ...currentCache,
        response: { ...currentCache.response, policyVersion: "old-policy" },
      }),
    });
    const response = await createMediaDiscoverHandler(dependencies)(gameRequest());

    expect(response.status).toBe(200);
    expect(dependencies.fetchDiscovery).toHaveBeenCalledTimes(1);
    expect(dependencies.writeCache).toHaveBeenCalledWith(
      "trending",
      "game",
      1,
      expect.objectContaining({ policyVersion: IGDB_CATALOG_POLICY_VERSION }),
    );
  });

  it("maps provider failures to stable safe HTTP errors", async () => {
    const dependencies = createHandlerDependencies({
      fetchDiscovery: jest
        .fn()
        .mockRejectedValue(new IgdbProviderError("igdb_rate_limited", 1000)),
    });
    const response = await createMediaDiscoverHandler(dependencies)(gameRequest());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      code: "igdb_rate_limited",
      error: "Games provider capacity is temporarily limited.",
    });
  });
});
