type Dependencies = {
  requireAuth: jest.Mock;
  requireGamesEnabled: jest.Mock;
  rpc: jest.Mock;
};

function loadHandler() {
  // Runtime-loaded so the Expo TypeScript program does not absorb Deno modules.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../supabase/functions/_shared/journal-game-lifecycle-handler') as {
    createJournalGameLifecycleHandler: (dependencies: Dependencies) => (
      request: Request,
    ) => Promise<Response>;
  };
}

function request(body: Record<string, unknown>) {
  return new Request('https://example.test/journal-game-lifecycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function dependencies(overrides: Partial<Dependencies> = {}) {
  return {
    requireAuth: jest.fn().mockResolvedValue({ userId: 'user-1' }),
    requireGamesEnabled: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: { event_id: 'event-1' }, error: null }),
    ...overrides,
  } satisfies Dependencies;
}

describe('Games Journal Edge boundary', () => {
  it('fails closed without RPC work when Games is disabled', async () => {
    const { HttpError } = require('../supabase/functions/_shared/cors') as {
      HttpError: new (status: number, message: string, code?: string) => Error;
    };
    const deps = dependencies({
      requireGamesEnabled: jest.fn(() => {
        throw new HttpError(503, 'Games are temporarily unavailable.', 'games_feature_disabled');
      }),
    });
    const handler = loadHandler().createJournalGameLifecycleHandler(deps);

    const response = await handler(request({
      eventDate: '2026-08-24',
      eventType: 'started',
      mediaItemId: 'game-1',
      notes: '',
      operation: 'log',
      rating: null,
      requestId: 'request-1',
      today: '2026-08-24',
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: 'games_feature_disabled',
      error: 'Games are temporarily unavailable.',
    });
    expect(deps.rpc).not.toHaveBeenCalled();
  });

  it('allows deletion as the Games-off privacy-control exception', async () => {
    const { HttpError } = require('../supabase/functions/_shared/cors') as {
      HttpError: new (status: number, message: string, code?: string) => Error;
    };
    const deps = dependencies({
      requireGamesEnabled: jest.fn(() => {
        throw new HttpError(503, 'Games are temporarily unavailable.', 'games_feature_disabled');
      }),
    });
    const handler = loadHandler().createJournalGameLifecycleHandler(deps);

    const response = await handler(request({
      emptyTitleAction: 'remove',
      eventId: 'event-1',
      operation: 'delete',
    }));

    expect(response.status).toBe(200);
    expect(deps.requireGamesEnabled).not.toHaveBeenCalled();
    expect(deps.rpc).toHaveBeenCalledWith('journal_server_delete_game_event', {
      p_empty_title_action: 'remove',
      p_event_id: 'event-1',
      p_user_id: 'user-1',
    });
  });

  it('uses the verified user ID and private game log RPC', async () => {
    const deps = dependencies();
    const handler = loadHandler().createJournalGameLifecycleHandler(deps);

    const response = await handler(request({
      eventDate: '2026-08-24',
      eventType: 'started',
      mediaItemId: 'game-1',
      notes: 'Playing',
      operation: 'log',
      playedOnPlatform: 'PC',
      rating: 4,
      requestId: 'request-1',
      resolveActivePlan: false,
      today: '2026-08-24',
      userId: 'forged-user',
    }));

    expect(response.status).toBe(200);
    expect(deps.rpc).toHaveBeenCalledWith('journal_server_log_game_event', {
      p_event_date: '2026-08-24',
      p_event_type: 'started',
      p_media_item_id: 'game-1',
      p_notes: 'Playing',
      p_played_on_platform: 'PC',
      p_rating: 4,
      p_request_id: 'request-1',
      p_resolve_active_plan: false,
      p_today: '2026-08-24',
      p_user_id: 'user-1',
    });
  });

  it('accepts the exact save-plan client body and routes plan/edit to server-only RPCs', async () => {
    const deps = dependencies();
    const handler = loadHandler().createJournalGameLifecycleHandler(deps);

    await handler(request({
      mediaItemId: 'game-1',
      operation: 'plan',
      plannedFor: '2026-09-01',
      today: '2026-08-24',
    }));
    await handler(request({
      eventDate: '2026-08-24',
      eventId: 'event-1',
      notes: 'Edited',
      operation: 'update',
      playedOnPlatform: 'Switch',
      rating: 5,
      today: '2026-08-24',
    }));

    expect(deps.rpc.mock.calls).toEqual([
      ['journal_server_save_game_plan', expect.objectContaining({
        p_media_item_id: 'game-1',
        p_planned_for: '2026-09-01',
        p_user_id: 'user-1',
      })],
      ['journal_server_update_game_event', expect.objectContaining({
        p_event_id: 'event-1',
        p_played_on_platform: 'Switch',
        p_user_id: 'user-1',
      })],
    ]);
  });
});
