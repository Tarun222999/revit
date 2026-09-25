import type { PublicCatalogTitle } from '@/types/publicCatalogTitle';

type Dependencies = {
  allowRequest: jest.Mock<boolean, []>;
  loadTitle: jest.Mock<Promise<PublicCatalogTitle | null>, [unknown]>;
};

function loadHandler() {
  // Runtime-loaded to keep the normal app compiler out of Deno-only imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../supabase/functions/_shared/public-title-handler') as {
    PUBLIC_TITLE_CACHE_CONTROL: string;
    PUBLIC_TITLE_UNAVAILABLE_MESSAGE: string;
    createPublicTitleHandler: (dependencies: Dependencies) => (request: Request) => Promise<Response>;
    parsePublicTitleRequest: (body: { titleId?: unknown }) => unknown;
  };
}

function loadPublicTitleMapper() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../supabase/functions/_shared/public-title-mapper') as {
    toPublicCatalogTitle: (row: Record<string, unknown>, identity: unknown) => PublicCatalogTitle | null;
  };
}

function loadThrottle() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../supabase/functions/_shared/public-title-throttle') as {
    createPublicTitleRequestThrottle: (now: () => number) => (request: Request) => boolean;
  };
}

const title: PublicCatalogTitle = {
  source: 'tmdb',
  sourceId: 'tv:1396',
  mediaType: 'series',
  title: 'Example series',
  originalTitle: null,
  description: 'Public catalog description.',
  releaseDate: '2026-01-01',
  year: '2026',
  imageUrl: null,
  backdropUrl: null,
  genres: ['Drama'],
  metadata: { seasonCount: 1 },
};

function request(titleId: unknown, headers = new Headers()) {
  return {
    headers,
    json: async () => ({ titleId }),
    method: 'POST',
  } as Request;
}

function dependencies(): Dependencies {
  return {
    allowRequest: jest.fn(() => true),
    loadTitle: jest.fn().mockResolvedValue(title),
  };
}

describe('public title resolver contract', () => {
  it('maps a persisted record into a whitelist DTO without ids, timestamps, or unapproved metadata', () => {
    const item = loadPublicTitleMapper().toPublicCatalogTitle(
      {
        id: 'internal-media-uuid',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        source: 'igdb',
        source_id: '1942',
        media_type: 'game',
        title: 'Example game',
        original_title: null,
        description: null,
        release_date: null,
        image_url: null,
        backdrop_url: null,
        genres: ['Adventure'],
        metadata: {
          platforms: ['PC'],
          totalRating: 90,
          privateJournalNote: 'must never leave the database',
        },
      },
      { source: 'igdb', sourceId: '1942', kind: 'game' },
    );

    expect(item).toEqual(expect.objectContaining({
      source: 'igdb',
      sourceId: '1942',
      metadata: { platforms: ['PC'], totalRating: 90 },
    }));
    expect(item).not.toHaveProperty('id');
    expect(item).not.toHaveProperty('created_at');
    expect(item?.metadata).not.toHaveProperty('privateJournalNote');
  });

  it('resolves only the shaped catalog DTO and marks it safely cacheable', async () => {
    const deps = dependencies();
    const module = loadHandler();
    const response = await module.createPublicTitleHandler(deps)(
      request('tmdb:tv:1396'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(module.PUBLIC_TITLE_CACHE_CONTROL);
    await expect(response.json()).resolves.toEqual({ item: title });
    expect(deps.loadTitle).toHaveBeenCalledWith({
      source: 'tmdb',
      sourceId: 'tv:1396',
      kind: 'tv',
    });
    // The handler has no provider, mutation, Journal, list, or profile dependency.
    expect(Object.keys(deps)).toEqual(['allowRequest', 'loadTitle']);
  });

  it.each(['tmdb:movie:0', 'tmdb:movie:8:extra', 'igdb:0', 'private-id'])
  ('returns the same calm unavailable response for malformed ids: %s', async (titleId) => {
    const deps = dependencies();
    const module = loadHandler();
    const response = await module.createPublicTitleHandler(deps)(request(titleId));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: 'title_unavailable',
      error: module.PUBLIC_TITLE_UNAVAILABLE_MESSAGE,
    });
    expect(deps.loadTitle).not.toHaveBeenCalled();
  });

  it('does not distinguish a missing normalized record from a malformed link', async () => {
    const deps = dependencies();
    deps.loadTitle.mockResolvedValue(null);
    const module = loadHandler();
    const response = await module.createPublicTitleHandler(deps)(request('igdb:1942'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: 'title_unavailable',
      error: module.PUBLIC_TITLE_UNAVAILABLE_MESSAGE,
    });
  });

  it('throttles before resolving the public catalog record', async () => {
    const deps = dependencies();
    deps.allowRequest.mockReturnValue(false);
    const response = await loadHandler().createPublicTitleHandler(deps)(request('igdb:1942'));

    expect(response.status).toBe(429);
    expect(deps.loadTitle).not.toHaveBeenCalled();
  });

  it('applies a conservative per-client request window', () => {
    const throttle = loadThrottle().createPublicTitleRequestThrottle(() => 1000);
    const clientRequest = request('tmdb:movie:550', new Headers({ 'x-real-ip': '203.0.113.10' }));

    expect(Array.from({ length: 30 }, () => throttle(clientRequest))).toEqual(
      Array.from({ length: 30 }, () => true),
    );
    expect(throttle(clientRequest)).toBe(false);
  });
});
