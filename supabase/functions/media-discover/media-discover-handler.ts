import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from "../_shared/cors.ts";
import type { NormalizedMediaItem } from "../_shared/media-normalizers.ts";
import {
  IgdbProviderError,
  toProviderHttpError,
} from "../_shared/provider-errors.ts";
import {
  isCachedDiscoverResponse,
  isUsableDiscoverCache,
} from "./discover-cache-policy.ts";
import { IGDB_CATALOG_POLICY_VERSION } from "./games-discover.ts";

export type DiscoverMode = "trending" | "new_releases" | "top_rated";
export type DiscoverMediaType = "movie" | "series" | "anime" | "game";

export type MediaDiscoverRequest = {
  mode?: unknown;
  mediaType?: unknown;
  page?: unknown;
};

export type DiscoverResponse = {
  results: NormalizedMediaItem[];
  page: number;
  totalPages: number;
  cachedAt: string;
  policyVersion?: string;
};

export type DiscoverCacheRow = {
  response: unknown;
  expiresAt: string;
};

export type MediaDiscoverHandlerDependencies = {
  authenticate: (request: Request) => Promise<unknown>;
  assertGamesEnabled: () => void;
  readCache: (
    mode: DiscoverMode,
    mediaType: DiscoverMediaType,
    page: number,
  ) => Promise<DiscoverCacheRow | null>;
  fetchDiscovery: (
    mode: DiscoverMode,
    mediaType: DiscoverMediaType,
    page: number,
  ) => Promise<{ results: NormalizedMediaItem[]; totalPages: number }>;
  writeCache: (
    mode: DiscoverMode,
    mediaType: DiscoverMediaType,
    page: number,
    response: DiscoverResponse,
  ) => Promise<void>;
  now?: () => number;
};

const DISCOVER_MODES = new Set<DiscoverMode>([
  "trending",
  "new_releases",
  "top_rated",
]);
const DISCOVER_MEDIA_TYPES = new Set<DiscoverMediaType>([
  "movie",
  "series",
  "anime",
  "game",
]);

function parsePage(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 1), 500);
}

export function parseMediaDiscoverRequest(body: MediaDiscoverRequest) {
  if (
    typeof body.mode !== "string" ||
    !DISCOVER_MODES.has(body.mode as DiscoverMode)
  ) {
    throw new HttpError(400, "A valid discovery mode is required.");
  }

  if (
    typeof body.mediaType !== "string" ||
    !DISCOVER_MEDIA_TYPES.has(body.mediaType as DiscoverMediaType)
  ) {
    throw new HttpError(400, "A valid discovery media type is required.");
  }

  return {
    mode: body.mode as DiscoverMode,
    mediaType: body.mediaType as DiscoverMediaType,
    page: parsePage(body.page),
  };
}

export function createMediaDiscoverHandler(
  dependencies: MediaDiscoverHandlerDependencies,
) {
  return async (request: Request) => {
    const optionsResponse = handleOptions(request);
    if (optionsResponse) {
      return optionsResponse;
    }

    try {
      if (request.method !== "POST") {
        throw new HttpError(405, "Method not allowed.");
      }

      await dependencies.authenticate(request);
      const body = await request.json().catch(() => {
        throw new HttpError(400, "A valid discovery request is required.");
      }) as MediaDiscoverRequest;
      const { mode, mediaType, page } = parseMediaDiscoverRequest(body);

      // The kill switch is checked before cache access so a cached Games row
      // cannot bypass a newly disabled capability.
      if (mediaType === "game") {
        dependencies.assertGamesEnabled();
      }

      const cacheRow = await dependencies.readCache(mode, mediaType, page);
      if (
        cacheRow &&
        isCachedDiscoverResponse(cacheRow.response) &&
        isUsableDiscoverCache(
          mediaType,
          cacheRow.expiresAt,
          cacheRow.response,
          dependencies.now?.() ?? Date.now(),
        )
      ) {
        return jsonResponse(cacheRow.response);
      }

      const discovery = await dependencies.fetchDiscovery(mode, mediaType, page);
      const response: DiscoverResponse = {
        cachedAt: new Date(dependencies.now?.() ?? Date.now()).toISOString(),
        page,
        results: discovery.results,
        totalPages: discovery.totalPages,
        ...(mediaType === "game"
          ? { policyVersion: IGDB_CATALOG_POLICY_VERSION }
          : {}),
      };

      await dependencies.writeCache(mode, mediaType, page, response);
      return jsonResponse(response);
    } catch (error) {
      return errorResponse(
        error instanceof IgdbProviderError ? toProviderHttpError(error) : error,
      );
    }
  };
}
