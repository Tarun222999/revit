import { createServiceClient } from './auth.ts';
import { IgdbProviderError } from './provider-errors.ts';

export type TokenClaim =
  | { action: 'ready'; accessToken: string; expiresAtMs: number }
  | { action: 'refresh'; leaseId: string }
  | { action: 'wait'; retryAfterMs: number };

export type RequestSlot =
  | { acquired: true; leaseId: string }
  | { acquired: false; retryAfterMs: number };

export interface IgdbCoordinationStore {
  claimToken(): Promise<TokenClaim>;
  storeToken(
    leaseId: string,
    accessToken: string,
    expiresInSeconds: number,
  ): Promise<boolean>;
  releaseTokenRefresh(leaseId: string): Promise<void>;
  invalidateToken(accessToken: string): Promise<void>;
  acquireRequestSlot(): Promise<RequestSlot>;
  releaseRequestSlot(leaseId: string): Promise<void>;
}

type RpcClient = ReturnType<typeof createServiceClient>;
const COORDINATION_TIMEOUT_MS = 3 * 1000;

function firstRow(data: unknown) {
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== 'object') {
    throw new IgdbProviderError('igdb_unavailable');
  }

  return data[0] as Record<string, unknown>;
}

async function requireRpcResult(
  request: Promise<{ data: unknown; error: unknown }>,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new IgdbProviderError('igdb_unavailable')),
      COORDINATION_TIMEOUT_MS,
    );
  });

  let result: { data: unknown; error: unknown };
  try {
    result = await Promise.race([request, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const { data, error } = result;

  if (error) {
    throw new IgdbProviderError('igdb_unavailable');
  }

  return data;
}

export class SupabaseIgdbCoordinationStore implements IgdbCoordinationStore {
  constructor(private readonly client: RpcClient = createServiceClient()) {}

  async claimToken(): Promise<TokenClaim> {
    const row = firstRow(
      await requireRpcResult(
        this.client.rpc('igdb_claim_token_refresh'),
      ),
    );

    if (row.action === 'refresh') {
      if (typeof row.refresh_lease_id !== 'string') {
        throw new IgdbProviderError('igdb_invalid_response');
      }
      return { action: 'refresh', leaseId: row.refresh_lease_id };
    }

    if (row.action === 'wait') {
      return {
        action: 'wait',
        retryAfterMs:
          typeof row.retry_after_ms === 'number' ? row.retry_after_ms : 100,
      };
    }

    const expiresAtMs = Date.parse(String(row.expires_at ?? ''));
    if (
      row.action !== 'ready' ||
      typeof row.access_token !== 'string' ||
      !Number.isFinite(expiresAtMs)
    ) {
      throw new IgdbProviderError('igdb_invalid_response');
    }

    return {
      action: 'ready',
      accessToken: row.access_token,
      expiresAtMs,
    };
  }

  async storeToken(
    leaseId: string,
    accessToken: string,
    expiresInSeconds: number,
  ) {
    const data = await requireRpcResult(
      this.client.rpc('igdb_store_token', {
        p_refresh_lease_id: leaseId,
        p_access_token: accessToken,
        p_expires_in_seconds: expiresInSeconds,
      }),
    );

    if (typeof data !== 'boolean') {
      throw new IgdbProviderError('igdb_invalid_response');
    }

    return data;
  }

  async releaseTokenRefresh(leaseId: string) {
    await requireRpcResult(
      this.client.rpc('igdb_release_token_refresh', {
        p_refresh_lease_id: leaseId,
      }),
    );
  }

  async invalidateToken(accessToken: string) {
    await requireRpcResult(
      this.client.rpc('igdb_invalidate_token', {
        p_access_token: accessToken,
      }),
    );
  }

  async acquireRequestSlot(): Promise<RequestSlot> {
    const row = firstRow(
      await requireRpcResult(this.client.rpc('igdb_acquire_request_slot')),
    );

    if (typeof row.lease_id === 'string') {
      return { acquired: true, leaseId: row.lease_id };
    }

    return {
      acquired: false,
      retryAfterMs:
        typeof row.retry_after_ms === 'number' ? row.retry_after_ms : 100,
    };
  }

  async releaseRequestSlot(leaseId: string) {
    await requireRpcResult(
      this.client.rpc('igdb_release_request_slot', {
        p_lease_id: leaseId,
      }),
    );
  }
}
