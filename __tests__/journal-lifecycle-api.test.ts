import {
  logJournalEvent,
  saveJournalPlan,
  toJournalMutationResult,
} from '@/features/journal/api/journal-mutation-api';
import type {
  JournalLifecycleIntent,
  JournalLifecycleSource,
} from '@/features/journal/types';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: jest.fn() },
}));

const mockRpc = supabase.rpc as jest.Mock;

function rawResult(overrides: Record<string, unknown> = {}) {
  return {
    affected_dates: ['2026-07-29'],
    event_id: 'event-1',
    idempotent_replay: false,
    journal_entry_id: 'entry-1',
    media_item_id: 'media-1',
    title_deleted: false,
    user_id: 'user-1',
    ...overrides,
  };
}

describe('Journal lifecycle API', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each<{
    eventType: string;
    intent: JournalLifecycleIntent;
    resolvesPlan: boolean;
    source: JournalLifecycleSource;
    suffix: string;
  }>([
    { eventType: 'started', intent: 'start', resolvesPlan: false, source: 'title', suffix: '1' },
    { eventType: 'started', intent: 'resume', resolvesPlan: true, source: 'planned_title', suffix: '2' },
    { eventType: 'completed', intent: 'complete', resolvesPlan: true, source: 'planner', suffix: '3' },
    { eventType: 'completed', intent: 'rewatch', resolvesPlan: false, source: 'title', suffix: '4' },
    { eventType: 'completed', intent: 'previous_watch', resolvesPlan: false, source: 'history', suffix: '5' },
    { eventType: 'stopped', intent: 'stop', resolvesPlan: false, source: 'title', suffix: '6' },
  ])(
    'maps $intent from $source to the approved event and plan behavior',
    async ({ eventType, intent, resolvesPlan, source, suffix }) => {
      mockRpc.mockResolvedValueOnce({ data: rawResult(), error: null });

      await logJournalEvent({
        eventDate: '2026-07-29',
        intent,
        mediaItemId: 'media-1',
        notes: '',
        rating: eventType === 'completed' ? 4.5 : null,
        requestId: `30000000-0000-4000-8000-00000000000${suffix}`,
        source,
        today: '2026-07-29',
      });

      expect(mockRpc).toHaveBeenLastCalledWith(
        'journal_log_event',
        expect.objectContaining({
          p_event_type: eventType,
          p_resolve_active_plan: resolvesPlan,
        }),
      );
    },
  );

  it('coalesces simultaneous submissions carrying the same request ID', async () => {
    let resolveRpc!: (value: { data: ReturnType<typeof rawResult>; error: null }) => void;
    mockRpc.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRpc = resolve;
      }),
    );
    const input = {
      eventDate: '2026-07-29',
      intent: 'complete' as const,
      mediaItemId: 'media-1',
      notes: 'Logged once',
      rating: 4,
      requestId: '30000000-0000-4000-8000-000000000010',
      source: 'title' as const,
      today: '2026-07-29',
    };

    const first = logJournalEvent(input);
    const second = logJournalEvent(input);

    expect(second).toBe(first);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    resolveRpc({ data: rawResult(), error: null });
    await expect(first).resolves.toMatchObject({ eventId: 'event-1' });
  });

  it('rejects invalid dates before calling the database', async () => {
    await expect(
      saveJournalPlan({
        mediaItemId: 'media-1',
        plannedFor: '2026-07-28',
        today: '2026-07-29',
      }),
    ).rejects.toThrow('cannot be in the past');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('normalizes and validates the database mutation result', () => {
    expect(
      toJournalMutationResult(
        rawResult({
          affected_dates: ['2026-07-29', '2026-07-29', '2026-08-01'],
          completed_count: 2,
          event_count: 3,
          had_active_plan: true,
        }),
      ),
    ).toMatchObject({
      affectedDates: ['2026-07-29', '2026-08-01'],
      completedCount: 2,
      eventCount: 3,
      hadActivePlan: true,
    });
  });
});
