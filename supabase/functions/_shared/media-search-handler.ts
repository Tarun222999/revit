import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from './cors.ts';
import type { IgdbGame } from './igdb-types.ts';
import {
  buildIgdbSearchQuery,
  executeMediaSearch,
  type MediaSearchDependencies,
  type SearchMediaType,
} from './media-search.ts';
import {
  IgdbProviderError,
  toProviderHttpError,
} from './provider-errors.ts';

type MediaSearchRequest = {
  query?: unknown;
  mediaType?: unknown;
  page?: unknown;
};

type IgdbQueryClient = {
  queryGames<T extends IgdbGame>(query: string): Promise<T[]>;
};

export type MediaSearchHandlerDependencies = Omit<
  MediaSearchDependencies,
  'searchGames'
> & {
  createIgdbClient: () => IgdbQueryClient;
  requireAuth: (request: Request) => Promise<unknown>;
};

const SEARCH_MEDIA_TYPES = new Set<SearchMediaType>([
  'all',
  'movie',
  'series',
  'anime',
  'game',
]);

function parsePage(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 1), 500);
}

function parseRequest(body: MediaSearchRequest) {
  if (typeof body.query !== 'string') {
    throw new HttpError(400, 'Search query is required.');
  }

  const query = body.query.trim();

  if (query.length < 2) {
    throw new HttpError(400, 'Search query must be at least 2 characters.');
  }

  const mediaType =
    typeof body.mediaType === 'string' &&
      SEARCH_MEDIA_TYPES.has(body.mediaType as SearchMediaType)
      ? (body.mediaType as SearchMediaType)
      : 'all';

  return { query, mediaType, page: parsePage(body.page) };
}

/**
 * Builds the HTTP boundary without touching IGDB. The provider client (and its
 * service-role coordination store) is constructed only if Search actually
 * executes an enabled Games request.
 */
export function createMediaSearchHandler(
  dependencies: MediaSearchHandlerDependencies,
) {
  return async (request: Request): Promise<Response> => {
    const optionsResponse = handleOptions(request);

    if (optionsResponse) {
      return optionsResponse;
    }

    try {
      if (request.method !== 'POST') {
        throw new HttpError(405, 'Method not allowed.');
      }

      await dependencies.requireAuth(request);
      const parsed = parseRequest(
        (await request.json()) as MediaSearchRequest,
      );
      let igdbClient: IgdbQueryClient | undefined;
      const response = await executeMediaSearch(parsed, {
        gamesEnabled: dependencies.gamesEnabled,
        requireGamesEnabled: dependencies.requireGamesEnabled,
        searchGames: (query) => {
          igdbClient ??= dependencies.createIgdbClient();
          return igdbClient.queryGames(buildIgdbSearchQuery(query));
        },
        searchMovies: dependencies.searchMovies,
        searchTv: dependencies.searchTv,
      });

      return jsonResponse({ ...response, page: parsed.page });
    } catch (error) {
      return errorResponse(
        error instanceof IgdbProviderError
          ? toProviderHttpError(error)
          : error,
      );
    }
  };
}
