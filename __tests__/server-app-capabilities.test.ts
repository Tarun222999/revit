import {
  GAMES_FEATURE_DISABLED_CODE,
  resolveGamesFeatureEnabled,
} from '../supabase/functions/_shared/app-capability-values';

describe('server Games capability', () => {
  it.each([undefined, '', 'false', 'TRUE', '1', ' true '])(
    'fails closed for %p',
    (value) => {
      const readEnvironment = () => value;

      expect(resolveGamesFeatureEnabled(readEnvironment)).toBe(false);
    },
  );

  it('enables Games only for the exact true value', () => {
    expect(resolveGamesFeatureEnabled(() => 'true')).toBe(true);
  });

  it('keeps the server rejection code stable', () => {
    expect(GAMES_FEATURE_DISABLED_CODE).toBe('games_feature_disabled');
  });

  it('fails closed when environment access throws', () => {
    expect(
      resolveGamesFeatureEnabled(() => {
        throw new Error('environment unavailable');
      }),
    ).toBe(false);
  });

  it('returns false and rejects with a typed error when Games are disabled', () => {
    // Runtime-loaded so the app TypeScript project does not absorb Deno modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serverCapabilities = require('../supabase/functions/_shared/app-capabilities') as {
      getAppCapabilities: (reader: () => string | undefined) => {
        gamesEnabled: boolean;
      };
      requireGamesFeatureEnabled: (reader: () => string | undefined) => void;
    };
    const throwingReader = () => {
      throw new Error('environment unavailable');
    };

    expect(serverCapabilities.getAppCapabilities(throwingReader)).toEqual({
      gamesEnabled: false,
    });
    expect(() =>
      serverCapabilities.requireGamesFeatureEnabled(throwingReader),
    ).toThrow(
      expect.objectContaining({
        status: 503,
        code: GAMES_FEATURE_DISABLED_CODE,
      }),
    );
  });

  it('serves the exact public capability, preflight, and method responses', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAppCapabilitiesHandler } = require('../supabase/functions/_shared/app-capabilities-handler') as {
      createAppCapabilitiesHandler: (
        reader: () => string | undefined,
      ) => (request: Request) => Response;
    };
    const handler = createAppCapabilitiesHandler(() => undefined);

    const postResponse = handler({ method: 'POST' } as Request);
    expect(postResponse.status).toBe(200);
    await expect(postResponse.json()).resolves.toEqual({ gamesEnabled: false });

    const optionsResponse = handler({ method: 'OPTIONS' } as Request);
    expect(optionsResponse.status).toBe(200);
    expect(optionsResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const getResponse = handler({ method: 'GET' } as Request);
    expect(getResponse.status).toBe(405);
    await expect(getResponse.json()).resolves.toEqual({
      error: 'Method not allowed.',
    });
  });

  it('keeps uncoded errors backward compatible and adds stable codes only when set', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { errorResponse, HttpError } = require('../supabase/functions/_shared/cors') as {
      errorResponse: (error: unknown) => Response;
      HttpError: new (status: number, message: string, code?: string) => Error;
    };

    await expect(errorResponse(new HttpError(400, 'Bad request.')).json()).resolves.toEqual({
      error: 'Bad request.',
    });
    await expect(
      errorResponse(
        new HttpError(503, 'Games unavailable.', GAMES_FEATURE_DISABLED_CODE),
      ).json(),
    ).resolves.toEqual({
      error: 'Games unavailable.',
      code: GAMES_FEATURE_DISABLED_CODE,
    });
  });
});
