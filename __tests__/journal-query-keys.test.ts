import { QueryClient } from '@tanstack/react-query';

import {
  invalidateJournalReadData,
  journalReadKeys,
  reconcileJournalPlannerCache,
} from '@/features/journal/api/journal-query-keys';

describe('v1.1 Journal cache invalidation', () => {
  it('invalidates every Calendar range after a replay can forget an old month', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const july = journalReadKeys.calendar('user-1', '2026-06-28', '2026-08-08');
    const september = journalReadKeys.calendar(
      'user-1',
      '2026-08-30',
      '2026-10-10',
    );
    const anotherUser = journalReadKeys.calendar(
      'user-2',
      '2026-06-28',
      '2026-08-08',
    );

    queryClient.setQueryData(july, { events: [], plans: [] });
    queryClient.setQueryData(september, { events: [], plans: [] });
    queryClient.setQueryData(anotherUser, { events: [], plans: [] });

    // A response-loss retry after moving July -> September can return only the
    // already-mutated September date. July must still be refreshed.
    await invalidateJournalReadData(queryClient, {
      affectedDates: ['2026-09-30'],
      journalEntryId: 'entry-1',
      mediaItemId: 'media-1',
      userId: 'user-1',
    });

    expect(queryClient.getQueryState(july)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(september)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(anotherUser)?.isInvalidated).toBe(false);
    queryClient.clear();
  });

  it('matches every Planner day when invalidating without a local day', async () => {
    const queryClient = new QueryClient();
    const planner = journalReadKeys.planner('user-1', '2026-08-09');
    queryClient.setQueryData(planner, []);

    await invalidateJournalReadData(queryClient, {
      affectedDates: [],
      journalEntryId: 'entry-1',
      mediaItemId: 'media-1',
      userId: 'user-1',
    });

    expect(queryClient.getQueryState(planner)?.isInvalidated).toBe(true);
    queryClient.clear();
  });

  it('removes a resolved title from every cached Planner day for one user', () => {
    const queryClient = new QueryClient();
    const today = journalReadKeys.planner('user-1', '2026-08-09');
    const tomorrow = journalReadKeys.planner('user-1', '2026-08-10');
    const anotherUser = journalReadKeys.planner('user-2', '2026-08-09');
    const resolved = {
      media: { id: 'media-1' },
      titleState: { id: 'entry-1' },
    };
    const remaining = {
      media: { id: 'media-2' },
      titleState: { id: 'entry-2' },
    };

    queryClient.setQueryData(today, [resolved, remaining]);
    queryClient.setQueryData(tomorrow, [resolved]);
    queryClient.setQueryData(anotherUser, [resolved]);

    reconcileJournalPlannerCache(queryClient, {
      journalEntryId: 'entry-1',
      mediaItemId: 'media-1',
      userId: 'user-1',
    });

    expect(queryClient.getQueryData(today)).toEqual([remaining]);
    expect(queryClient.getQueryData(tomorrow)).toEqual([]);
    expect(queryClient.getQueryData(anotherUser)).toEqual([resolved]);
    queryClient.clear();
  });
});
