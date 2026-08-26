import { HttpError } from './cors.ts';

export type IgdbProviderErrorCode =
  | 'igdb_not_configured'
  | 'igdb_authentication_failed'
  | 'igdb_rate_limited'
  | 'igdb_unavailable'
  | 'igdb_invalid_response';

const SAFE_MESSAGES: Record<IgdbProviderErrorCode, string> = {
  igdb_not_configured: 'Games provider configuration is unavailable.',
  igdb_authentication_failed: 'Games provider authentication failed.',
  igdb_rate_limited: 'Games provider capacity is temporarily limited.',
  igdb_unavailable: 'Games provider is temporarily unavailable.',
  igdb_invalid_response: 'Games provider returned an invalid response.',
};

export class IgdbProviderError extends Error {
  readonly code: IgdbProviderErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: IgdbProviderErrorCode, retryAfterMs?: number) {
    super(SAFE_MESSAGES[code]);
    this.name = 'IgdbProviderError';
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function toProviderHttpError(error: IgdbProviderError) {
  const status = error.code === 'igdb_rate_limited' ? 429 : 503;
  return new HttpError(status, error.message, error.code);
}
