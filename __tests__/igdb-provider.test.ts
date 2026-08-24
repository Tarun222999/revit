jest.mock('../supabase/functions/_shared/auth.ts', () => ({
  createServiceClient: jest.fn(),
}));

type CoordinationStore = {
  claimToken: jest.Mock;
  storeToken: jest.Mock;
  releaseTokenRefresh: jest.Mock;
  invalidateToken: jest.Mock;
  acquireRequestSlot: jest.Mock;
  releaseRequestSlot: jest.Mock;
};

function createCoordinationStore(): CoordinationStore {
  return {
    claimToken: jest.fn(),
    storeToken: jest.fn().mockResolvedValue(true),
    releaseTokenRefresh: jest.fn().mockResolvedValue(undefined),
    invalidateToken: jest.fn().mockResolvedValue(undefined),
    acquireRequestSlot: jest
      .fn()
      .mockResolvedValue({ acquired: true, leaseId: 'lease-1' }),
    releaseRequestSlot: jest.fn().mockResolvedValue(undefined),
  };
}

function loadTokenManager() {
  // Runtime loading keeps the app TypeScript project separate from Deno imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../supabase/functions/_shared/igdb-token-manager') as {
    IgdbTokenManager: new (dependencies: Record<string, unknown>) => {
      getAccessToken: (rejectedToken?: string) => Promise<string>;
    };
  };
}

function loadIgdbClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../supabase/functions/_shared/igdb') as {
    IgdbClient: new (dependencies: Record<string, unknown>) => {
      query: <T>(endpoint: 'game_time_to_beats', query: string) => Promise<T[]>;
      queryGames: <T>(query: string) => Promise<T[]>;
      queryPopularityPrimitives: <T>(query: string) => Promise<T[]>;
    };
    requestTwitchAppToken: (
      credentials: { clientId: string; clientSecret: string },
      fetcher: jest.Mock,
    ) => Promise<{ accessToken: string; expiresInSeconds: number }>;
  };
}

describe('IgdbTokenManager', () => {
  it('acquires once and reuses a valid local token', async () => {
    const { IgdbTokenManager } = loadTokenManager();
    const coordination = createCoordinationStore();
    coordination.claimToken.mockResolvedValue({
      action: 'refresh',
      leaseId: 'refresh-lease-1',
    });
    const requestToken = jest.fn().mockResolvedValue({
      accessToken: 'fixture-token',
      expiresInSeconds: 3600,
    });
    const manager = new IgdbTokenManager({
      coordination,
      credentials: () => ({ clientId: 'fixture-id', clientSecret: 'fixture-secret' }),
      requestToken,
      now: () => 1_000_000,
    });

    await expect(manager.getAccessToken()).resolves.toBe('fixture-token');
    await expect(manager.getAccessToken()).resolves.toBe('fixture-token');
    expect(requestToken).toHaveBeenCalledTimes(1);
    expect(coordination.claimToken).toHaveBeenCalledTimes(1);
    expect(coordination.storeToken).toHaveBeenCalledWith(
      'refresh-lease-1',
      'fixture-token',
      3600,
    );
  });

  it('coalesces concurrent token requests within an Edge instance', async () => {
    const { IgdbTokenManager } = loadTokenManager();
    const coordination = createCoordinationStore();
    coordination.claimToken.mockResolvedValue({
      action: 'refresh',
      leaseId: 'refresh-lease-1',
    });
    const requestToken = jest.fn().mockResolvedValue({
      accessToken: 'shared-token',
      expiresInSeconds: 3600,
    });
    const manager = new IgdbTokenManager({
      coordination,
      credentials: () => ({ clientId: 'fixture-id', clientSecret: 'fixture-secret' }),
      requestToken,
    });

    await expect(
      Promise.all([manager.getAccessToken(), manager.getAccessToken()]),
    ).resolves.toEqual(['shared-token', 'shared-token']);
    expect(requestToken).toHaveBeenCalledTimes(1);
    expect(coordination.claimToken).toHaveBeenCalledTimes(1);
  });

  it('waits for a distributed refresh owner and reuses its token', async () => {
    const { IgdbTokenManager } = loadTokenManager();
    const coordination = createCoordinationStore();
    coordination.claimToken
      .mockResolvedValueOnce({ action: 'wait', retryAfterMs: 50 })
      .mockResolvedValueOnce({
        action: 'ready',
        accessToken: 'distributed-token',
        expiresAtMs: 2_000_000,
      });
    const sleep = jest.fn().mockResolvedValue(undefined);
    const requestToken = jest.fn();
    const manager = new IgdbTokenManager({
      coordination,
      credentials: () => ({ clientId: 'fixture-id', clientSecret: 'fixture-secret' }),
      requestToken,
      now: () => 1_000_000,
      sleep,
    });

    await expect(manager.getAccessToken()).resolves.toBe('distributed-token');
    expect(sleep).toHaveBeenCalledWith(50);
    expect(requestToken).not.toHaveBeenCalled();
  });

  it('validates configuration before claiming shared token state', async () => {
    const { IgdbTokenManager } = loadTokenManager();
    const coordination = createCoordinationStore();
    const manager = new IgdbTokenManager({
      coordination,
      credentials: () => {
        throw new Error('not configured');
      },
      requestToken: jest.fn(),
    });

    await expect(manager.getAccessToken()).rejects.toThrow('not configured');
    expect(coordination.claimToken).not.toHaveBeenCalled();
  });

  it('bounds distributed token waiting even with a non-advancing test clock', async () => {
    const { IgdbTokenManager } = loadTokenManager();
    const coordination = createCoordinationStore();
    coordination.claimToken.mockResolvedValue({
      action: 'wait',
      retryAfterMs: 25,
    });
    const manager = new IgdbTokenManager({
      coordination,
      credentials: () => ({ clientId: 'fixture-id', clientSecret: 'fixture-secret' }),
      requestToken: jest.fn(),
      now: () => 1_000_000,
      sleep: jest.fn().mockResolvedValue(undefined),
    });

    await expect(manager.getAccessToken()).rejects.toMatchObject({
      code: 'igdb_authentication_failed',
    });
    expect(coordination.claimToken).toHaveBeenCalledTimes(40);
  });

  it('reuses a newer token after a delayed rejection of the previous token', async () => {
    const { IgdbTokenManager } = loadTokenManager();
    const coordination = createCoordinationStore();
    coordination.claimToken
      .mockResolvedValueOnce({
        action: 'refresh',
        leaseId: 'refresh-lease-1',
      })
      .mockResolvedValueOnce({
        action: 'ready',
        accessToken: 'replacement-token',
        expiresAtMs: 10_000_000,
      });
    const manager = new IgdbTokenManager({
      coordination,
      credentials: () => ({ clientId: 'fixture-id', clientSecret: 'fixture-secret' }),
      requestToken: jest.fn().mockResolvedValue({
        accessToken: 'previous-token',
        expiresInSeconds: 3600,
      }),
      now: () => 1_000_000,
    });

    await expect(manager.getAccessToken()).resolves.toBe('previous-token');
    await expect(manager.getAccessToken('previous-token')).resolves.toBe(
      'replacement-token',
    );
    await expect(manager.getAccessToken('previous-token')).resolves.toBe(
      'replacement-token',
    );

    expect(coordination.invalidateToken).toHaveBeenCalledTimes(1);
    expect(coordination.invalidateToken).toHaveBeenCalledWith('previous-token');
  });

  it('preserves a mid-refresh feature-disabled error and releases its lease', async () => {
    const { IgdbTokenManager } = loadTokenManager();
    const coordination = createCoordinationStore();
    coordination.claimToken.mockResolvedValue({
      action: 'refresh',
      leaseId: 'refresh-lease-1',
    });
    const featureError = Object.assign(new Error('Games unavailable'), {
      code: 'games_feature_disabled',
    });
    const requestToken = jest.fn();
    const manager = new IgdbTokenManager({
      coordination,
      credentials: () => ({ clientId: 'fixture-id', clientSecret: 'fixture-secret' }),
      requestToken,
      assertEnabled: () => {
        throw featureError;
      },
    });

    await expect(manager.getAccessToken()).rejects.toBe(featureError);
    expect(requestToken).not.toHaveBeenCalled();
    expect(coordination.releaseTokenRefresh).toHaveBeenCalledWith(
      'refresh-lease-1',
    );
  });
});

describe('IGDB credential boundary', () => {
  it('uses only the documented server-side environment names', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getIgdbCredentials } = require('../supabase/functions/_shared/igdb-credentials') as {
      getIgdbCredentials: (
        reader: (name: string) => string | undefined,
      ) => { clientId: string; clientSecret: string };
    };
    const reader = jest.fn((name: string) =>
      name === 'IGDB_CLIENT_ID'
        ? ' fixture-id '
        : name === 'IGDB_CLIENT_SECRET'
          ? ' fixture-secret '
          : undefined,
    );

    expect(getIgdbCredentials(reader)).toEqual({
      clientId: 'fixture-id',
      clientSecret: 'fixture-secret',
    });
    expect(reader.mock.calls).toEqual([
      ['IGDB_CLIENT_ID'],
      ['IGDB_CLIENT_SECRET'],
    ]);
  });

  it('returns one safe typed error for missing or inaccessible values', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getIgdbCredentials } = require('../supabase/functions/_shared/igdb-credentials') as {
      getIgdbCredentials: (reader: () => string | undefined) => unknown;
    };

    expect(() => getIgdbCredentials(() => undefined)).toThrow(
      expect.objectContaining({ code: 'igdb_not_configured' }),
    );
    expect(() =>
      getIgdbCredentials(() => {
        throw new Error('fixture-secret');
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'igdb_not_configured',
        message: 'Games provider configuration is unavailable.',
      }),
    );
  });
});

describe('IgdbClient', () => {
  function createDependencies(overrides: Record<string, unknown> = {}) {
    const coordination = createCoordinationStore();
    const tokenManager = {
      getAccessToken: jest.fn().mockResolvedValue('token-one'),
    };
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([{ id: 42, name: 'Fixture Game' }]), {
          status: 200,
        }),
      );
    const dependencies = {
      assertEnabled: jest.fn(),
      coordination,
      credentials: jest.fn(() => ({
        clientId: 'fixture-client',
        clientSecret: 'fixture-secret',
      })),
      tokenManager,
      fetcher,
      sleep: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };

    return { coordination, tokenManager, fetcher, dependencies };
  }

  it('checks the feature before credentials, tokens, slots, or provider calls', async () => {
    const { IgdbClient } = loadIgdbClient();
    const featureError = Object.assign(new Error('Games unavailable'), {
      code: 'games_feature_disabled',
    });
    const { dependencies, coordination, tokenManager, fetcher } =
      createDependencies({
        assertEnabled: () => {
          throw featureError;
        },
      });
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id;')).rejects.toBe(featureError);
    expect(dependencies.credentials).not.toHaveBeenCalled();
    expect(tokenManager.getAccessToken).not.toHaveBeenCalled();
    expect(coordination.acquireRequestSlot).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends centralized headers/body and releases its distributed slot', async () => {
    const { IgdbClient } = loadIgdbClient();
    const { dependencies, coordination, fetcher } = createDependencies();
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id,name; limit 10;')).resolves.toEqual([
      { id: 42, name: 'Fixture Game' },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.igdb.com/v4/games',
      expect.objectContaining({
        method: 'POST',
        body: 'fields id,name; limit 10;',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-one',
          'Client-ID': 'fixture-client',
        }),
      }),
    );
    expect(coordination.releaseRequestSlot).toHaveBeenCalledWith('lease-1');
  });

  it('routes the constrained secondary endpoint through the same slot and auth client', async () => {
    const { IgdbClient } = loadIgdbClient();
    const { dependencies, coordination, fetcher } = createDependencies();
    const client = new IgdbClient(dependencies);

    await client.query('game_time_to_beats',
      'fields game_id,normally; where game_id = 42; limit 1;',
    );

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.igdb.com/v4/game_time_to_beats',
      expect.objectContaining({
        body: 'fields game_id,normally; where game_id = 42; limit 1;',
      }),
    );
    expect(coordination.releaseRequestSlot).toHaveBeenCalledWith('lease-1');
  });

  it('uses the same protected transport for popularity primitives', async () => {
    const { IgdbClient } = loadIgdbClient();
    const { dependencies, coordination, fetcher } = createDependencies();
    const client = new IgdbClient(dependencies);

    await client.queryPopularityPrimitives('fields game_id,value; limit 10;');

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.igdb.com/v4/popularity_primitives',
      expect.objectContaining({
        body: 'fields game_id,value; limit 10;',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-one',
          'Client-ID': 'fixture-client',
        }),
      }),
    );
    expect(coordination.releaseRequestSlot).toHaveBeenCalledWith('lease-1');
  });

  it('replaces a rejected token once after a 401', async () => {
    const { IgdbClient } = loadIgdbClient();
    const { dependencies, tokenManager, fetcher } = createDependencies();
    tokenManager.getAccessToken
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('replacement-token');
    fetcher
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id;')).resolves.toEqual([]);
    expect(tokenManager.getAccessToken).toHaveBeenNthCalledWith(1);
    expect(tokenManager.getAccessToken).toHaveBeenNthCalledWith(
      2,
      'expired-token',
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('honors one controlled 429 delay and retry', async () => {
    const { IgdbClient } = loadIgdbClient();
    const sleep = jest.fn().mockResolvedValue(undefined);
    const { dependencies, fetcher } = createDependencies({ sleep });
    fetcher
      .mockResolvedValueOnce(
        new Response('', { status: 429, headers: { 'Retry-After': '1' } }),
      )
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id;')).resolves.toEqual([]);
    expect(sleep).toHaveBeenCalledWith(1000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns a stable safe outage without leaking an upstream body', async () => {
    const { IgdbClient } = loadIgdbClient();
    const { dependencies, fetcher } = createDependencies();
    fetcher.mockResolvedValueOnce(
      new Response('secret upstream diagnostics', { status: 503 }),
    );
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id;')).rejects.toMatchObject({
      code: 'igdb_unavailable',
      message: 'Games provider is temporarily unavailable.',
    });
  });

  it('bounds distributed slot waiting and returns a typed rate limit', async () => {
    const { IgdbClient } = loadIgdbClient();
    const { dependencies, coordination, fetcher } = createDependencies({
      now: () => 1_000_000,
      sleep: jest.fn().mockResolvedValue(undefined),
    });
    coordination.acquireRequestSlot.mockResolvedValue({
      acquired: false,
      retryAfterMs: 25,
    });
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id;')).rejects.toMatchObject({
      code: 'igdb_rate_limited',
      retryAfterMs: 1000,
    });
    expect(coordination.acquireRequestSlot).toHaveBeenCalledTimes(50);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rechecks the kill switch before a provider retry', async () => {
    const { IgdbClient } = loadIgdbClient();
    let enabled = true;
    const featureError = Object.assign(new Error('Games unavailable'), {
      code: 'games_feature_disabled',
    });
    const sleep = jest.fn(async () => {
      enabled = false;
    });
    const { dependencies, fetcher, coordination } = createDependencies({
      assertEnabled: () => {
        if (!enabled) throw featureError;
      },
      sleep,
    });
    fetcher.mockResolvedValueOnce(new Response('', { status: 429 }));
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id;')).rejects.toBe(featureError);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(coordination.releaseRequestSlot).toHaveBeenCalledTimes(2);
  });

  it('does not mask a successful provider response when lease cleanup fails', async () => {
    const { IgdbClient } = loadIgdbClient();
    const { dependencies, coordination } = createDependencies();
    coordination.releaseRequestSlot.mockRejectedValue(
      new Error('coordination unavailable'),
    );
    const client = new IgdbClient(dependencies);

    await expect(client.queryGames('fields id;')).resolves.toEqual([
      { id: 42, name: 'Fixture Game' },
    ]);
  });
});

describe('Supabase IGDB coordination adapter', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('bounds a hung coordination RPC', async () => {
    jest.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseIgdbCoordinationStore } = require('../supabase/functions/_shared/igdb-coordination') as {
      SupabaseIgdbCoordinationStore: new (client: Record<string, unknown>) => {
        claimToken: () => Promise<unknown>;
      };
    };
    const store = new SupabaseIgdbCoordinationStore({
      rpc: jest.fn().mockReturnValue(new Promise(() => undefined)),
    });
    const rejection = expect(store.claimToken()).rejects.toMatchObject({
      code: 'igdb_unavailable',
    });

    await jest.advanceTimersByTimeAsync(3000);
    await rejection;
  });
});

describe('Twitch token transport', () => {
  it('models an app token without a refresh-token contract', async () => {
    const { requestTwitchAppToken } = loadIgdbClient();
    const fetcher = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'fixture-token', expires_in: 3600 }),
        { status: 200 },
      ),
    );

    await expect(
      requestTwitchAppToken(
        { clientId: 'fixture-client', clientSecret: 'fixture-secret' },
        fetcher,
      ),
    ).resolves.toEqual({ accessToken: 'fixture-token', expiresInSeconds: 3600 });
  });

  it('redacts credentials and upstream bodies from authentication errors', async () => {
    const { requestTwitchAppToken } = loadIgdbClient();
    const fetcher = jest.fn().mockResolvedValue(
      new Response('fixture-secret should never escape', { status: 401 }),
    );

    const request = requestTwitchAppToken(
      { clientId: 'fixture-client', clientSecret: 'fixture-secret' },
      fetcher,
    );
    await expect(request).rejects.toMatchObject({
      code: 'igdb_authentication_failed',
      message: 'Games provider authentication failed.',
    });
    await expect(request).rejects.not.toThrow(/fixture-secret/);
  });
});
