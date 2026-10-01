import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from './cors.ts';
import type { PublicCatalogTitle } from '../../../types/publicCatalogTitle.ts';

export type PublicTitleRequest = {
  titleId?: unknown;
};

export type PublicTitleIdentity =
  | { source: 'tmdb'; sourceId: string; kind: 'movie' | 'tv' }
  | { source: 'igdb'; sourceId: string; kind: 'game' };

export type PublicTitleHandlerDependencies = {
  allowRequest: (request: Request) => boolean;
  loadTitle: (identity: PublicTitleIdentity) => Promise<PublicCatalogTitle | null>;
};

export const PUBLIC_TITLE_UNAVAILABLE_MESSAGE = "This title isn't available in Revit yet.";
export const PUBLIC_TITLE_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=600';

function unavailableError() {
  return new HttpError(404, PUBLIC_TITLE_UNAVAILABLE_MESSAGE, 'title_unavailable');
}

export function parsePublicTitleRequest(body: PublicTitleRequest): PublicTitleIdentity {
  if (typeof body.titleId !== 'string') {
    throw unavailableError();
  }

  const tmdbMatch = /^tmdb:(movie|tv):([1-9]\d*)$/.exec(body.titleId);
  if (tmdbMatch) {
    return {
      source: 'tmdb',
      sourceId: `${tmdbMatch[1]}:${tmdbMatch[2]}`,
      kind: tmdbMatch[1] as 'movie' | 'tv',
    };
  }

  const igdbMatch = /^igdb:([1-9]\d*)$/.exec(body.titleId);
  if (igdbMatch) {
    return { source: 'igdb', sourceId: igdbMatch[1], kind: 'game' };
  }

  throw unavailableError();
}

function publicTitleResponse(item: PublicCatalogTitle) {
  const response = jsonResponse({ item });
  response.headers.set('Cache-Control', PUBLIC_TITLE_CACHE_CONTROL);
  response.headers.set('Vary', 'Origin');
  return response;
}

export function createPublicTitleHandler(
  dependencies: PublicTitleHandlerDependencies,
) {
  return async (request: Request) => {
    const optionsResponse = handleOptions(request);
    if (optionsResponse) return optionsResponse;

    try {
      if (request.method !== 'POST') {
        throw new HttpError(405, 'Method not allowed.');
      }

      if (!dependencies.allowRequest(request)) {
        throw new HttpError(429, 'Please try again in a moment.', 'title_lookup_limited');
      }

      const identity = parsePublicTitleRequest(
        (await request.json()) as PublicTitleRequest,
      );
      const item = await dependencies.loadTitle(identity);

      if (!item) {
        throw unavailableError();
      }

      return publicTitleResponse(item);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
