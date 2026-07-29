import { QueryClient } from '@tanstack/react-query';

import {
  invalidateJournalReadData,
  journalReadKeys,
} from '@/features/journal/api/journal-query-keys';

describe('v1.1 Journal cache invalidation', () => {
  it('invalidates only Calendar ranges containing an affected user date', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const july = journalReadKeys.calendar(
      'user-1',
      '2026-06-28',
      '2026-08-08',
    );
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

    await invalidateJournalReadData(queryClient, {
      affectedDates: ['2026-07-30'],
      journalEntryId: 'entry-1',
      mediaItemId: 'media-1',
      userId: 'user-1',
    });

    expect(queryClient.getQueryState(july)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(september)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(anotherUser)?.isInvalidated).toBe(false);
    queryClient.clear();
  });
});
