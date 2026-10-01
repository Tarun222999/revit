import {
  getSearchMediaFilters,
  getSearchPlaceholder,
  getSearchResultRoute,
} from '@/features/discovery/model/search';
import type { NormalizedMediaItem } from '@/types/media';

type IgdbGame = {
  id: number;
  name: string;
  game_type: { type: string };
  game_status: { status: string };
  version_parent?: number;
  themes?: Array<{ id: number }>;
};

type MediaSearchDependencies = {
  gamesEnabled: () => boolean;
  requireGamesEnabled: () => void;
  searchGames: (query: string) => Promise<IgdbGame[]>;
  searchMovies: (query: string, page: number) => Promise<{
    results: NormalizedMediaItem[];
    totalPages: number;
  }>;
  searchTv: (
    query: string,
    page: number,
    mediaType: 'all' | 'series' | 'anime',
  ) => Promise<{ results: NormalizedMediaItem[]; totalPages: number }>;
};

function loadEdgeSearch() {
  // Edge modules intentionally remain outside the Expo TypeScript program.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const search = require('../supabase/functions/_shared/media-search') as {
    buildIgdbSearchQuery: (query: string) => string;
    executeMediaSearch: (
      request: { mediaType: string; page: number; query: string },
      dependencies: MediaSearchDependencies,
    ) => Promise<unknown>;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const provider = require('../supabase/functions/_shared/provider-errors') as {
    IgdbProviderError: new (
      code: 'igdb_rate_limited' | 'igdb_unavailable',
      retryAfterMs?: number,
    ) => Error;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const handler = require('../supabase/functions/_shared/media-search-handler') as {
    createMediaSearchHandler: (
      dependencies: Record<string, unknown>,
    ) => (request: Request) => Promise<Response>;
  };

  return {
    ...search,
    createMediaSearchHandler: handler.createMediaSearchHandler,
    IgdbProviderError: provider.IgdbProviderError,
  };
}

const movie = (title: string, popularity: number): NormalizedMediaItem => ({
  source: 'tmdb',
  sourceId: `movie:${title}`,
  mediaType: 'movie',
  title,
  genres: [],
  metadata: { popularity },
});

function game(id: number, name: string, overrides: Partial<IgdbGame> = {}): IgdbGame {
  return {
    id,
    name,
    game_type: { type: 'Main Game' },
    game_status: { status: 'Released' },
    ...overrides,
  };
}

function dependencies(overrides: Partial<MediaSearchDependencies> = {}) {
  return {
    gamesEnabled: () => true,
    requireGamesEnabled: jest.fn(),
    searchGames: jest.fn().mockResolvedValue([]),
    searchMovies: jest.fn().mockResolvedValue({
      results: [movie('Movie lower', 5), movie('Movie higher', 20)],
      totalPages: 3,
    }),
    searchTv: jest.fn().mockResolvedValue({
      results: [movie('Series middle', 10)],
      totalPages: 2,
    }),
    ...overrides,
  } satisfies MediaSearchDependencies;
}

describe('Games Search server composition', () => {
  it('keeps IGDB relevance order for the Games filter and applies the shared catalog policy', async () => {
    const { executeMediaSearch } = loadEdgeSearch();
    const provider = dependencies({
      searchGames: jest.fn().mockResolvedValue([
        game(30, 'Third result'),
        game(10, 'Excluded edition', { version_parent: 5 }),
        game(20, 'Second result'),
        game(40, 'Excluded erotic', { themes: [{ id: 42 }] }),
      ]),
    });

    await expect(
      executeMediaSearch(
        { mediaType: 'game', page: 1, query: 'fixture' },
        provider,
      ),
    ).resolves.toEqual({
      results: [
        expect.objectContaining({ source: 'igdb', sourceId: '30', title: 'Third result' }),
        expect.objectContaining({ source: 'igdb', sourceId: '20', title: 'Second result' }),
      ],
      totalPages: 1,
    });
    expect(provider.requireGamesEnabled).toHaveBeenCalledTimes(1);
  });

  it('keeps TMDB results first in All and appends eligible Games without comparing provider ranks', async () => {
    const { executeMediaSearch } = loadEdgeSearch();
    const provider = dependencies({
      searchGames: jest.fn().mockResolvedValue([
        game(7, 'IGDB first by similarity'),
        game(8, 'IGDB second by similarity'),
      ]),
    });

    const result = await executeMediaSearch(
      { mediaType: 'all', page: 1, query: 'fixture' },
      provider,
    );

    expect((result as { results: NormalizedMediaItem[] }).results.map((item) => item.title)).toEqual([
      'Movie higher',
      'Series middle',
      'Movie lower',
      'IGDB first by similarity',
      'IGDB second by similarity',
    ]);
    expect((result as { totalPages: number }).totalPages).toBe(3);
  });

  it('returns TMDB results plus quiet Games-unavailable metadata when an enabled All search loses IGDB', async () => {
    const { executeMediaSearch, IgdbProviderError } = loadEdgeSearch();
    const provider = dependencies({
      searchGames: jest
        .fn()
        .mockRejectedValue(new IgdbProviderError('igdb_unavailable')),
    });

    const result = await executeMediaSearch(
      { mediaType: 'all', page: 1, query: 'fixture' },
      provider,
    );

    expect((result as { gamesUnavailable?: boolean }).gamesUnavailable).toBe(true);
    expect((result as { results: NormalizedMediaItem[] }).results).toHaveLength(3);
  });

  it('returns the typed post-retry rate-limit failure for Games-only search', async () => {
    const { executeMediaSearch, IgdbProviderError } = loadEdgeSearch();
    const rateLimitError = new IgdbProviderError('igdb_rate_limited', 1000);
    const provider = dependencies({
      searchGames: jest.fn().mockRejectedValue(rateLimitError),
    });

    await expect(
      executeMediaSearch(
        { mediaType: 'game', page: 1, query: 'fixture' },
        provider,
      ),
    ).rejects.toBe(rateLimitError);
  });

  it('does not touch the provider while the Games feature is disabled', async () => {
    const { executeMediaSearch } = loadEdgeSearch();
    const disabled = Object.assign(new Error('Games disabled'), {
      code: 'games_feature_disabled',
    });
    const provider = dependencies({
      gamesEnabled: () => false,
      requireGamesEnabled: () => {
        throw disabled;
      },
    });

    await expect(
      executeMediaSearch(
        { mediaType: 'all', page: 1, query: 'fixture' },
        provider,
      ),
    ).resolves.toEqual(expect.objectContaining({ results: expect.any(Array) }));
    expect(provider.searchGames).not.toHaveBeenCalled();

    await expect(
      executeMediaSearch(
        { mediaType: 'game', page: 1, query: 'fixture' },
        provider,
      ),
    ).rejects.toBe(disabled);
    expect(provider.searchGames).not.toHaveBeenCalled();
  });

  it('builds a bounded, escaped IGDB query with the policy relations needed after fetch', () => {
    const { buildIgdbSearchQuery } = loadEdgeSearch();
    const query = buildIgdbSearchQuery('The "Game" \\ test');

    expect(query).toContain('search "The \\"Game\\" \\\\ test";');
    expect(query).toContain('game_type.type');
    expect(query).toContain('game_status.status');
    expect(query).toContain('themes.id');
    expect(query).toContain('version_parent.id');
    expect(query).toContain('where game_type = (0,8,9)');
    expect(query).toContain(
      '(game_status = null | game_status = (0,2,3,4,5))',
    );
    expect(query).toContain('version_parent = null');
    expect(query).toContain('themes != (42)');
    expect(query).toContain('limit 20;');
    expect(query).not.toContain('popularity');
  });
});

describe('Games Search HTTP boundary', () => {
  function handlerDependencies(overrides: Record<string, unknown> = {}) {
    return {
      createIgdbClient: jest.fn(() => {
        throw new Error('IGDB setup must stay lazy');
      }),
      gamesEnabled: () => false,
      requireAuth: jest.fn().mockResolvedValue(undefined),
      requireGamesEnabled: jest.fn(),
      searchMovies: jest.fn().mockResolvedValue({
        results: [movie('TMDB movie', 10)],
        totalPages: 1,
      }),
      searchTv: jest.fn().mockResolvedValue({ results: [], totalPages: 1 }),
      ...overrides,
    };
  }

  function searchRequest(mediaType: string) {
    return new Request('https://example.test/media-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaType, page: 1, query: 'dune' }),
    });
  }

  it.each(['movie', 'series', 'anime'])(
    'serves TMDB-only %s without constructing IGDB coordination or credentials',
    async (mediaType) => {
      const { createMediaSearchHandler } = loadEdgeSearch();
      const dependencies = handlerDependencies();
      const response = await createMediaSearchHandler(dependencies)(
        searchRequest(mediaType),
      );

      expect(response.status).toBe(200);
      expect(dependencies.createIgdbClient).not.toHaveBeenCalled();
    },
  );

  it('serves disabled All with TMDB data and never constructs IGDB', async () => {
    const { createMediaSearchHandler } = loadEdgeSearch();
    const dependencies = handlerDependencies();
    const response = await createMediaSearchHandler(dependencies)(
      searchRequest('all'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      page: 1,
      results: [expect.objectContaining({ title: 'TMDB movie' })],
      totalPages: 1,
    });
    expect(dependencies.createIgdbClient).not.toHaveBeenCalled();
  });

  it('returns typed games_feature_disabled without constructing IGDB', async () => {
    const { createMediaSearchHandler } = loadEdgeSearch();
    // Runtime-loaded to keep Deno modules outside the app TypeScript program.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HttpError } = require('../supabase/functions/_shared/cors') as {
      HttpError: new (status: number, message: string, code?: string) => Error;
    };
    const dependencies = handlerDependencies({
      requireGamesEnabled: () => {
        throw new HttpError(
          503,
          'Games are temporarily unavailable.',
          'games_feature_disabled',
        );
      },
    });
    const response = await createMediaSearchHandler(dependencies)(
      searchRequest('game'),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: 'games_feature_disabled',
      error: 'Games are temporarily unavailable.',
    });
    expect(dependencies.createIgdbClient).not.toHaveBeenCalled();
  });

  it('maps the shared provider post-retry 429 to a safe typed response', async () => {
    const {
      createMediaSearchHandler,
      IgdbProviderError,
    } = loadEdgeSearch();
    const queryGames = jest
      .fn()
      .mockRejectedValue(new IgdbProviderError('igdb_rate_limited', 1000));
    const dependencies = handlerDependencies({
      createIgdbClient: jest.fn(() => ({ queryGames })),
      gamesEnabled: () => true,
    });
    const response = await createMediaSearchHandler(dependencies)(
      searchRequest('game'),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      code: 'igdb_rate_limited',
      error: 'Games provider capacity is temporarily limited.',
    });
    expect(queryGames).toHaveBeenCalledTimes(1);
  });
});

describe('Games Search client model', () => {
  it('shows Games last only when the server-authoritative capability is enabled', () => {
    expect(getSearchMediaFilters(false).map((filter) => filter.value)).toEqual([
      'all',
      'movie',
      'series',
      'anime',
    ]);
    expect(getSearchMediaFilters(true).map((filter) => filter.value)).toEqual([
      'all',
      'movie',
      'series',
      'anime',
      'game',
    ]);
    expect(getSearchPlaceholder(true)).toContain('games');
  });

  it('uses the provider-aware title route for an IGDB result', () => {
    expect(
      getSearchResultRoute({
        source: 'igdb',
        sourceId: '1234',
        mediaType: 'game',
        title: 'Fixture Game',
        genres: [],
        metadata: {},
      }),
    ).toBe('igdb:1234');
  });
});
