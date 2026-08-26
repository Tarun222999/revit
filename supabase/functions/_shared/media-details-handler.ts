import { GAMES_FEATURE_DISABLED_CODE } from './app-capability-values.ts';
import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from './cors.ts';
import type {
  MediaSource,
  NormalizedMediaItem,
} from './media-normalizers.ts';
import {
  IgdbProviderError,
  toProviderHttpError,
} from './provider-errors.ts';

export type MediaDetailsRequest = {
  mediaItemId?: unknown;
  source?: unknown;
  sourceId?: unknown;
};

export type MediaDetailsHandlerDependencies = {
  fetchIgdbDetails: (sourceId: string) => Promise<NormalizedMediaItem>;
  fetchTmdbDetails: (sourceId: string) => Promise<NormalizedMediaItem>;
  gamesEnabled: () => boolean;
  loadMediaItemById: (mediaItemId: string) => Promise<NormalizedMediaItem>;
  loadMediaItemBySourceId: (
    source: MediaSource,
    sourceId: string,
  ) => Promise<NormalizedMediaItem | null>;
  requireAuth: (request: Request) => Promise<unknown>;
  upsertMediaItem: (item: NormalizedMediaItem) => Promise<NormalizedMediaItem>;
};

export function parseMediaDetailsRequest(body: MediaDetailsRequest) {
  if (typeof body.mediaItemId === 'string' && body.mediaItemId.trim()) {
    return {
      kind: 'mediaItemId' as const,
      mediaItemId: body.mediaItemId.trim(),
    };
  }

  if (
    (body.source !== 'tmdb' && body.source !== 'igdb') ||
    typeof body.sourceId !== 'string' ||
    !body.sourceId.trim()
  ) {
    throw new HttpError(400, 'Media source and source id are required.');
  }

  return {
    kind: 'sourceId' as const,
    source: body.source as MediaSource,
    sourceId: body.sourceId.trim(),
  };
}

function gamesDisabledError() {
  return new HttpError(
    503,
    'Games are temporarily unavailable.',
    GAMES_FEATURE_DISABLED_CODE,
  );
}

function canUsePersistedGameSnapshot(error: unknown) {
  return (
    error instanceof IgdbProviderError ||
    (error instanceof HttpError && (error.status === 404 || error.status === 503))
  );
}

export function createMediaDetailsHandler(
  dependencies: MediaDetailsHandlerDependencies,
) {
  return async (request: Request) => {
    const optionsResponse = handleOptions(request);
    if (optionsResponse) return optionsResponse;

    try {
      if (request.method !== 'POST') {
        throw new HttpError(405, 'Method not allowed.');
      }

      await dependencies.requireAuth(request);
      const body = (await request.json()) as MediaDetailsRequest;
      const parsedRequest = parseMediaDetailsRequest(body);

      if (parsedRequest.kind === 'mediaItemId') {
        const persistedItem = await dependencies.loadMediaItemById(
          parsedRequest.mediaItemId,
        );
        if (persistedItem.source !== 'igdb') {
          return jsonResponse({ item: persistedItem });
        }

        if (!dependencies.gamesEnabled()) {
          return jsonResponse({ item: persistedItem });
        }

        try {
          const refreshedItem = await dependencies.fetchIgdbDetails(
            persistedItem.sourceId,
          );
          return jsonResponse({
            item: await dependencies.upsertMediaItem(refreshedItem),
          });
        } catch (error) {
          if (canUsePersistedGameSnapshot(error)) {
            return jsonResponse({ item: persistedItem });
          }
          throw error;
        }
      }

      if (parsedRequest.source === 'igdb') {
        // Provider routes are also used by persisted game list items. When
        // Games is disabled, keep those private snapshots readable while
        // refusing uncached catalog access. This preserves existing list
        // management without reopening any new provider-backed affordance.
        const persistedItem = await dependencies.loadMediaItemBySourceId(
          parsedRequest.source,
          parsedRequest.sourceId,
        );
        if (!dependencies.gamesEnabled()) {
          if (persistedItem) return jsonResponse({ item: persistedItem });
          throw gamesDisabledError();
        }

        const item = await dependencies.fetchIgdbDetails(parsedRequest.sourceId);
        return jsonResponse({ item: await dependencies.upsertMediaItem(item) });
      }

      const existingItem = await dependencies.loadMediaItemBySourceId(
        parsedRequest.source,
        parsedRequest.sourceId,
      );
      if (existingItem) return jsonResponse({ item: existingItem });

      const item = await dependencies.fetchTmdbDetails(parsedRequest.sourceId);
      return jsonResponse({ item: await dependencies.upsertMediaItem(item) });
    } catch (error) {
      if (error instanceof IgdbProviderError) {
        return errorResponse(toProviderHttpError(error));
      }
      return errorResponse(error);
    }
  };
}
