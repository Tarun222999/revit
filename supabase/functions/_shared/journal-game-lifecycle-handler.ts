import type { AuthContext } from './auth.ts';
import { errorResponse, handleOptions, HttpError, jsonResponse } from './cors.ts';

type GameLogRequest = {
  eventDate: string;
  eventType: string;
  mediaItemId: string;
  notes: string;
  operation: 'log';
  playedOnPlatform: string | undefined;
  rating: number | null;
  requestId: string;
  resolveActivePlan: boolean;
  today: string;
};

type GamePlanRequest = {
  mediaItemId: string;
  operation: 'plan';
  plannedFor: string | null;
  today: string;
};

type GameUpdateRequest = {
  eventDate: string;
  eventId: string;
  notes: string;
  operation: 'update';
  playedOnPlatform: string | undefined;
  rating: number | null;
  today: string;
};

type GameDeleteRequest = {
  emptyTitleAction: 'keep_someday' | 'remove' | null;
  eventId: string;
  operation: 'delete';
};

type GameMutationRequest =
  | GameLogRequest
  | GamePlanRequest
  | GameUpdateRequest
  | GameDeleteRequest;

export type JournalGameLifecycleDependencies = {
  requireAuth: (request: Request) => Promise<AuthContext>;
  requireGamesEnabled: () => void;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function requireString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, `${label} is required.`);
  }
  return value;
}

function parseRequest(value: unknown): GameMutationRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Invalid Games Journal request.');
  }
  const body = value as Record<string, unknown>;
  if (
    body.operation !== 'log' &&
    body.operation !== 'plan' &&
    body.operation !== 'update' &&
    body.operation !== 'delete'
  ) {
    throw new HttpError(400, 'Unsupported Games Journal operation.');
  }

  if (body.operation === 'plan') {
    if (body.plannedFor !== null && typeof body.plannedFor !== 'string') {
      throw new HttpError(400, 'Planned date is invalid.');
    }
    return {
      mediaItemId: requireString(body.mediaItemId, 'Media item'),
      operation: 'plan',
      plannedFor: body.plannedFor ?? null,
      today: requireString(body.today, 'Today'),
    };
  }

  if (body.operation === 'delete') {
    if (
      body.emptyTitleAction !== undefined &&
      body.emptyTitleAction !== null &&
      body.emptyTitleAction !== 'keep_someday' &&
      body.emptyTitleAction !== 'remove'
    ) {
      throw new HttpError(400, 'Empty title action is invalid.');
    }
    return {
      emptyTitleAction: body.emptyTitleAction ?? null,
      eventId: requireString(body.eventId, 'Event ID'),
      operation: 'delete',
    };
  }

  if (body.rating !== null && typeof body.rating !== 'number') {
    throw new HttpError(400, 'Rating is invalid.');
  }

  if (body.operation === 'log') {
    return {
      eventDate: requireString(body.eventDate, 'Event date'),
      eventType: requireString(body.eventType, 'Event type'),
      mediaItemId: requireString(body.mediaItemId, 'Media item'),
      notes: typeof body.notes === 'string' ? body.notes : '',
      operation: 'log',
      playedOnPlatform: typeof body.playedOnPlatform === 'string' ? body.playedOnPlatform : undefined,
      rating: body.rating,
      requestId: requireString(body.requestId, 'Request ID'),
      resolveActivePlan: body.resolveActivePlan === true,
      today: requireString(body.today, 'Today'),
    };
  }

  return {
    eventDate: requireString(body.eventDate, 'Event date'),
    eventId: requireString(body.eventId, 'Event ID'),
    notes: typeof body.notes === 'string' ? body.notes : '',
    operation: 'update',
    playedOnPlatform: typeof body.playedOnPlatform === 'string' ? body.playedOnPlatform : undefined,
    rating: body.rating,
    today: requireString(body.today, 'Today'),
  };
}

function getRpcRequest(input: GameMutationRequest, userId: string) {
  switch (input.operation) {
    case 'log':
      return {
        name: 'journal_server_log_game_event',
        args: {
          p_today: input.today,
          p_user_id: userId,
          p_event_date: input.eventDate,
          p_event_type: input.eventType,
          p_media_item_id: input.mediaItemId,
          p_notes: input.notes,
          p_played_on_platform: input.playedOnPlatform ?? null,
          p_rating: input.rating,
          p_request_id: input.requestId,
          p_resolve_active_plan: input.resolveActivePlan,
        },
      };
    case 'plan':
      return {
        name: 'journal_server_save_game_plan',
        args: {
          p_today: input.today,
          p_user_id: userId,
          p_media_item_id: input.mediaItemId,
          p_planned_for: input.plannedFor ?? null,
        },
      };
    case 'update':
      return {
        name: 'journal_server_update_game_event',
        args: {
          p_today: input.today,
          p_user_id: userId,
          p_event_date: input.eventDate,
          p_event_id: input.eventId,
          p_notes: input.notes,
          p_played_on_platform: input.playedOnPlatform ?? null,
          p_rating: input.rating,
        },
      };
    case 'delete':
      return {
        name: 'journal_server_delete_game_event',
        args: {
          p_empty_title_action: input.emptyTitleAction,
          p_event_id: input.eventId,
          p_user_id: userId,
        },
      };
  }
}

export function createJournalGameLifecycleHandler(
  dependencies: JournalGameLifecycleDependencies,
) {
  return async (request: Request): Promise<Response> => {
    const optionsResponse = handleOptions(request);
    if (optionsResponse) return optionsResponse;

    try {
      if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
      const user = await dependencies.requireAuth(request);
      const input = parseRequest(await request.json());
      if (input.operation !== 'delete') dependencies.requireGamesEnabled();
      const rpcRequest = getRpcRequest(input, user.userId);
      const { data, error } = await dependencies.rpc(rpcRequest.name, rpcRequest.args);
      if (error) throw new HttpError(400, 'Unable to save this Games Journal change.');
      return jsonResponse(data);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
