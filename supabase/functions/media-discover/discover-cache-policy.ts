import { IGDB_CATALOG_POLICY_VERSION } from './games-discover.ts';

export type CachedDiscoverResponse = {
  results: unknown[];
  page: number;
  totalPages: number;
  cachedAt: string;
  policyVersion?: string;
};

export function isCachedDiscoverResponse(
  value: unknown,
): value is CachedDiscoverResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<CachedDiscoverResponse>;
  return (
    Array.isArray(response.results) &&
    typeof response.page === "number" &&
    typeof response.totalPages === "number" &&
    typeof response.cachedAt === "string"
  );
}

export function isUsableDiscoverCache(
  mediaType: "movie" | "series" | "anime" | "game",
  expiresAt: string,
  response: CachedDiscoverResponse,
  now = Date.now(),
) {
  if (new Date(expiresAt).getTime() <= now) {
    return false;
  }

  return (
    mediaType !== "game" ||
    response.policyVersion === IGDB_CATALOG_POLICY_VERSION
  );
}
