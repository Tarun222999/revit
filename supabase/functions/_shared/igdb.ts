import { requireGamesFeatureEnabled } from './app-capabilities.ts';
import {
  SupabaseIgdbCoordinationStore,
  type IgdbCoordinationStore,
} from './igdb-coordination.ts';
import {
  getIgdbCredentials,
  type IgdbCredentials,
} from './igdb-credentials.ts';
import {
  IgdbTokenManager,
  type TwitchAppToken,
} from './igdb-token-manager.ts';
import { IgdbProviderError } from './provider-errors.ts';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_API_BASE_URL = 'https://api.igdb.com/v4';
const PROVIDER_TIMEOUT_MS = 10 * 1000;
const SLOT_WAIT_TIMEOUT_MS = 5 * 1000;
const SLOT_WAIT_MAX_ATTEMPTS = 50;

type Fetcher = typeof fetch;
export type IgdbEndpoint = 'games' | 'popularity_primitives';

type IgdbClientDependencies = {
  assertEnabled: () => void;
  coordination: IgdbCoordinationStore;
  credentials: () => IgdbCredentials;
  tokenManager: IgdbTokenManager;
  fetcher?: Fetcher;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function parseRetryAfter(response: Response) {
  const seconds = Number(response.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1000, 5000)
    : 500;
}

export async function requestTwitchAppToken(
  credentials: IgdbCredentials,
  fetcher: Fetcher = fetch,
): Promise<TwitchAppToken> {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: 'client_credentials',
  });

  let response: Response;
  try {
    response = await fetcher(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new IgdbProviderError('igdb_authentication_failed');
  }

  if (!response.ok) {
    throw new IgdbProviderError('igdb_authentication_failed');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new IgdbProviderError('igdb_invalid_response');
  }

  if (!data || typeof data !== 'object') {
    throw new IgdbProviderError('igdb_invalid_response');
  }

  const token = data as { access_token?: unknown; expires_in?: unknown };
  if (
    typeof token.access_token !== 'string' ||
    typeof token.expires_in !== 'number'
  ) {
    throw new IgdbProviderError('igdb_invalid_response');
  }

  return {
    accessToken: token.access_token,
    expiresInSeconds: token.expires_in,
  };
}

export class IgdbClient {
  private readonly fetcher: Fetcher;
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(private readonly dependencies: IgdbClientDependencies) {
    this.fetcher = dependencies.fetcher ?? fetch;
    this.now = dependencies.now ?? Date.now;
    this.sleep = dependencies.sleep ?? defaultSleep;
  }

  async queryGames<T>(query: string): Promise<T[]> {
    return this.query<T>('games', query);
  }

  async queryPopularityPrimitives<T>(query: string): Promise<T[]> {
    return this.query<T>('popularity_primitives', query);
  }

  private async query<T>(endpoint: IgdbEndpoint, query: string): Promise<T[]> {
    this.dependencies.assertEnabled();
    const credentials = this.dependencies.credentials();
    let accessToken = await this.dependencies.tokenManager.getAccessToken();
    let authenticationRetries = 0;
    let rateLimitRetries = 0;

    while (true) {
      const response = await this.requestWithSlot(
        endpoint,
        query,
        credentials.clientId,
        accessToken,
      );

      if (response.status === 401 && authenticationRetries === 0) {
        authenticationRetries += 1;
        accessToken = await this.dependencies.tokenManager.getAccessToken(
          accessToken,
        );
        continue;
      }

      if (response.status === 429 && rateLimitRetries === 0) {
        rateLimitRetries += 1;
        await this.sleep(parseRetryAfter(response));
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new IgdbProviderError('igdb_authentication_failed');
      }

      if (response.status === 429) {
        throw new IgdbProviderError(
          'igdb_rate_limited',
          parseRetryAfter(response),
        );
      }

      if (!response.ok) {
        throw new IgdbProviderError('igdb_unavailable');
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new IgdbProviderError('igdb_invalid_response');
      }

      if (!Array.isArray(data)) {
        throw new IgdbProviderError('igdb_invalid_response');
      }

      return data as T[];
    }
  }

  private async requestWithSlot(
    endpoint: IgdbEndpoint,
    query: string,
    clientId: string,
    accessToken: string,
  ) {
    const deadline = this.now() + SLOT_WAIT_TIMEOUT_MS;

    for (
      let attempt = 0;
      attempt < SLOT_WAIT_MAX_ATTEMPTS && this.now() <= deadline;
      attempt += 1
    ) {
      const slot = await this.dependencies.coordination.acquireRequestSlot();
      if (!slot.acquired) {
        await this.sleep(Math.max(25, Math.min(slot.retryAfterMs, 1000)));
        continue;
      }

      try {
        this.dependencies.assertEnabled();
        try {
          return await this.fetcher(`${IGDB_API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${accessToken}`,
              'Client-ID': clientId,
              'Content-Type': 'text/plain',
            },
            body: query,
            signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
          });
        } catch {
          throw new IgdbProviderError('igdb_unavailable');
        }
      } finally {
        await this.dependencies.coordination
          .releaseRequestSlot(slot.leaseId)
          .catch(() => undefined);
      }
    }

    throw new IgdbProviderError('igdb_rate_limited', 1000);
  }
}

export function createIgdbClient() {
  const coordination = new SupabaseIgdbCoordinationStore();
  const tokenManager = new IgdbTokenManager({
    coordination,
    credentials: getIgdbCredentials,
    requestToken: (credentials) => requestTwitchAppToken(credentials),
    assertEnabled: requireGamesFeatureEnabled,
  });

  return new IgdbClient({
    assertEnabled: requireGamesFeatureEnabled,
    coordination,
    credentials: getIgdbCredentials,
    tokenManager,
  });
}
