import type {
  IgdbCoordinationStore,
  TokenClaim,
} from './igdb-coordination.ts';
import type { IgdbCredentials } from './igdb-credentials.ts';
import { IgdbProviderError } from './provider-errors.ts';

export type TwitchAppToken = {
  accessToken: string;
  expiresInSeconds: number;
};

type TokenManagerDependencies = {
  coordination: IgdbCoordinationStore;
  credentials: () => IgdbCredentials;
  requestToken: (credentials: IgdbCredentials) => Promise<TwitchAppToken>;
  assertEnabled?: () => void;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;
const TOKEN_WAIT_TIMEOUT_MS = 20 * 1000;
const TOKEN_WAIT_MAX_ATTEMPTS = 40;

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function validateToken(token: TwitchAppToken) {
  if (
    !token.accessToken ||
    token.accessToken.length > 4096 ||
    !Number.isInteger(token.expiresInSeconds) ||
    token.expiresInSeconds < 60
  ) {
    throw new IgdbProviderError('igdb_invalid_response');
  }
}

export class IgdbTokenManager {
  private localToken: { accessToken: string; expiresAtMs: number } | null = null;
  private inFlight: Promise<string> | null = null;
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(private readonly dependencies: TokenManagerDependencies) {
    this.now = dependencies.now ?? Date.now;
    this.sleep = dependencies.sleep ?? defaultSleep;
  }

  getAccessToken(rejectedToken?: string) {
    if (
      this.localToken &&
      this.localToken.expiresAtMs > this.now() + TOKEN_EXPIRY_SKEW_MS &&
      (!rejectedToken || this.localToken.accessToken !== rejectedToken)
    ) {
      return Promise.resolve(this.localToken.accessToken);
    }

    if (!rejectedToken && this.inFlight) {
      return this.inFlight;
    }

    const request = this.acquireToken(rejectedToken).finally(() => {
      if (this.inFlight === request) {
        this.inFlight = null;
      }
    });
    this.inFlight = request;
    return request;
  }

  private async acquireToken(rejectedToken?: string) {
    // Validate configuration before touching shared token state.
    const credentials = this.dependencies.credentials();

    if (rejectedToken) {
      await this.dependencies.coordination.invalidateToken(rejectedToken);
      if (
        !this.localToken ||
        this.localToken.accessToken === rejectedToken ||
        this.localToken.expiresAtMs <= this.now() + TOKEN_EXPIRY_SKEW_MS
      ) {
        this.localToken = null;
      }
    }

    const deadline = this.now() + TOKEN_WAIT_TIMEOUT_MS;

    for (
      let attempt = 0;
      attempt < TOKEN_WAIT_MAX_ATTEMPTS && this.now() <= deadline;
      attempt += 1
    ) {
      const claim = await this.dependencies.coordination.claimToken();

      if (claim.action === 'ready') {
        this.rememberClaim(claim);
        return claim.accessToken;
      }

      if (claim.action === 'wait') {
        await this.sleep(Math.max(25, Math.min(claim.retryAfterMs, 1000)));
        continue;
      }

      try {
        this.dependencies.assertEnabled?.();
      } catch (error) {
        await this.dependencies.coordination
          .releaseTokenRefresh(claim.leaseId)
          .catch(() => undefined);
        throw error;
      }

      try {
        const token = await this.dependencies.requestToken(credentials);
        validateToken(token);
        const stored = await this.dependencies.coordination.storeToken(
          claim.leaseId,
          token.accessToken,
          token.expiresInSeconds,
        );
        if (!stored) {
          continue;
        }
        this.localToken = {
          accessToken: token.accessToken,
          expiresAtMs: this.now() + token.expiresInSeconds * 1000,
        };
        return token.accessToken;
      } catch (error) {
        await this.dependencies.coordination
          .releaseTokenRefresh(claim.leaseId)
          .catch(() => undefined);
        if (error instanceof IgdbProviderError) {
          throw error;
        }
        throw new IgdbProviderError('igdb_authentication_failed');
      }
    }

    throw new IgdbProviderError('igdb_authentication_failed');
  }

  private rememberClaim(claim: Extract<TokenClaim, { action: 'ready' }>) {
    this.localToken = {
      accessToken: claim.accessToken,
      expiresAtMs: claim.expiresAtMs,
    };
  }
}
