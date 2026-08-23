import type { NormalizedMediaItem } from '@/types/media';

type HandlerDependencies = {
  fetchIgdbDetails: jest.Mock<Promise<NormalizedMediaItem>, [string]>;
  fetchTmdbDetails: jest.Mock<Promise<NormalizedMediaItem>, [string]>;
  gamesEnabled: jest.Mock<boolean, []>;
  loadMediaItemById: jest.Mock<Promise<NormalizedMediaItem>, [string]>;
  loadMediaItemBySourceId: jest.Mock<Promise<NormalizedMediaItem | null>, [string, string]>;
  requireAuth: jest.Mock<Promise<void>, [Request]>;
  upsertMediaItem: jest.Mock<Promise<NormalizedMediaItem>, [NormalizedMediaItem]>;
};

const persistedGame: NormalizedMediaItem = {
  id: 'media-game',
  source: 'igdb',
  sourceId: '42',
  mediaType: 'game',
  title: 'Persisted game',
  genres: [],
  metadata: { igdbCatalogPolicyVersion: 'games-catalog-v1' },
};

function dependencies(): HandlerDependencies {
  return {
    fetchIgdbDetails: jest.fn(),
    fetchTmdbDetails: jest.fn(),
    gamesEnabled: jest.fn(() => true),
    loadMediaItemById: jest.fn().mockResolvedValue(persistedGame),
    loadMediaItemBySourceId: jest.fn().mockResolvedValue(null),
    requireAuth: jest.fn().mockResolvedValue(undefined),
    upsertMediaItem: jest.fn(async (item) => ({ ...item, id: item.id ?? 'saved' })),
  };
}

function request(body: Record<string, unknown>) {
  return {
    json: async () => body,
    method: 'POST',
  } as Request;
}

function loadHandler() {
  // Runtime-loaded so app TypeScript does not pull Deno-only extension imports
  // into its module graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('../supabase/functions/_shared/media-details-handler') as {
    createMediaDetailsHandler: (
      dependencies: HandlerDependencies,
    ) => (request: Request) => Promise<Response>;
  };
  return module.createMediaDetailsHandler;
}

describe('media-details game fallback handler', () => {
  it('serves a persisted game snapshot while Games are disabled without calling IGDB', async () => {
    const deps = dependencies();
    deps.gamesEnabled.mockReturnValue(false);
    const response = await loadHandler()(deps)(request({ mediaItemId: 'media-game' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ item: persistedGame });
    expect(deps.fetchIgdbDetails).not.toHaveBeenCalled();
    expect(deps.upsertMediaItem).not.toHaveBeenCalled();
  });

  it('rejects a direct IGDB route while disabled without invoking the provider', async () => {
    const deps = dependencies();
    deps.gamesEnabled.mockReturnValue(false);
    const response = await loadHandler()(deps)(
      request({ source: 'igdb', sourceId: '42' }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: 'games_feature_disabled',
      error: 'Games are temporarily unavailable.',
    });
    expect(deps.fetchIgdbDetails).not.toHaveBeenCalled();
  });

  it.each(['provider outage', 'policy exclusion'])(
    'calmly returns the persisted snapshot after %s',
    async (scenario) => {
      const deps = dependencies();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { HttpError } = require('../supabase/functions/_shared/cors') as {
        HttpError: new (status: number, message: string) => Error;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { IgdbProviderError } = require('../supabase/functions/_shared/provider-errors') as {
        IgdbProviderError: new (code: 'igdb_unavailable') => Error;
      };
      deps.fetchIgdbDetails.mockRejectedValue(
        scenario === 'provider outage'
          ? new IgdbProviderError('igdb_unavailable')
          : new HttpError(404, 'Title not found.'),
      );

      const response = await loadHandler()(deps)(request({ mediaItemId: 'media-game' }));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ item: persistedGame });
      expect(deps.upsertMediaItem).not.toHaveBeenCalled();
    },
  );

  it('preserves typed provider failures for an uncached direct IGDB route', async () => {
    const deps = dependencies();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { IgdbProviderError } = require('../supabase/functions/_shared/provider-errors') as {
      IgdbProviderError: new (code: 'igdb_unavailable') => Error;
    };
    deps.fetchIgdbDetails.mockRejectedValue(new IgdbProviderError('igdb_unavailable'));

    const response = await loadHandler()(deps)(
      request({ source: 'igdb', sourceId: '42' }),
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: 'igdb_unavailable',
      error: 'Games provider is temporarily unavailable.',
    });
  });
});
