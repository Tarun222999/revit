import { HttpError, handleOptions, jsonResponse } from './cors.ts';
import type {
  ListSharingState,
  ManageListSharingInput,
  SharedListPage,
} from '../../../types/sharedList.ts';

const KEY = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const LIST_UNAVAILABLE = 'This list link is unavailable.';

export function unavailable() {
  return new HttpError(404, LIST_UNAVAILABLE, 'list_unavailable');
}

export function privateResponse(body: unknown, status = 200) {
  const response = jsonResponse(body, status);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Vary', 'Authorization, Origin');
  return response;
}

function failure(error: unknown) {
  // Never pass arbitrary DB/auth errors to console.error: they may include a key.
  return error instanceof HttpError
    ? privateResponse({ error: error.message, code: error.code }, error.status)
    : privateResponse({ error: 'Unable to load sharing right now.' }, 500);
}

async function body(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 4096) throw new HttpError(413, 'Request too large.');
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw unavailable();
    return value;
  } catch {
    throw unavailable();
  }
}

function guard(request: Request, allowRequest: (request: Request) => boolean) {
  if (request.method !== 'POST')
    throw new HttpError(405, 'Method not allowed.');
  if (!allowRequest(request))
    throw new HttpError(429, 'Please try again in a moment.');
}

export function createManageListSharingHandler(deps: {
  allowRequest: (request: Request) => boolean;
  requireUser: (request: Request) => Promise<string>;
  manage: (
    input: ManageListSharingInput,
    userId: string,
  ) => Promise<ListSharingState | { code: string }>;
}) {
  return async (request: Request) => {
    const options = handleOptions(request);
    if (options) return options;
    try {
      guard(request, deps.allowRequest);
      const userId = await deps.requireUser(request);
      const input = await body(request);
      if (
        typeof input.listId !== 'string' ||
        !UUID.test(input.listId) ||
        !['state', 'share', 'stop'].includes(String(input.action))
      )
        throw unavailable();
      if (
        input.action !== 'state' &&
        (!Number.isSafeInteger(input.expectedVersion) ||
          Number(input.expectedVersion) < 0)
      ) {
        throw new HttpError(400, 'Reload sharing and try again.');
      }
      const result = await deps.manage(
        {
          listId: input.listId,
          action: input.action as ManageListSharingInput['action'],
          expectedVersion: input.expectedVersion as number | undefined,
        },
        userId,
      );
      if ('code' in result) {
        if (result.code === 'sharing_conflict')
          throw new HttpError(
            409,
            'Sharing changed. Reload and try again.',
            'sharing_conflict',
          );
        throw unavailable();
      }
      return privateResponse(result);
    } catch (error) {
      return failure(error);
    }
  };
}

export function createSharedListHandler(deps: {
  allowRequest: (request: Request) => boolean;
  viewer: (request: Request) => Promise<string | null>;
  resolve: (
    key: string,
    cursor: string | null,
    viewerId: string | null,
  ) => Promise<SharedListPage | null>;
}) {
  return async (request: Request) => {
    const options = handleOptions(request);
    if (options) return options;
    try {
      guard(request, deps.allowRequest);
      const input = await body(request);
      if (typeof input.key !== 'string' || !KEY.test(input.key))
        throw unavailable();
      if (
        input.cursor != null &&
        (typeof input.cursor !== 'string' || input.cursor.length > 512)
      )
        throw unavailable();
      const result = await deps.resolve(
        input.key,
        (input.cursor as string | null) ?? null,
        await deps.viewer(request),
      );
      if (!result) throw unavailable();
      return privateResponse(result);
    } catch (error) {
      return failure(error);
    }
  };
}
