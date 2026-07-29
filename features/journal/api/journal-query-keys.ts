import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { assertJournalDate } from '@/features/journal/model/journalReadModels';

export const journalReadKeys = {
  all: ['journal', 'v1.1'] as const,
  user: (userId?: string) => [...journalReadKeys.all, userId] as const,
  titleState: (userId?: string, mediaItemId?: string) =>
    [...journalReadKeys.user(userId), 'title-state', mediaItemId] as const,
  titleSummary: (userId?: string, mediaItemId?: string) =>
    [...journalReadKeys.user(userId), 'title-summary', mediaItemId] as const,
  history: (userId?: string, journalEntryId?: string) =>
    [...journalReadKeys.user(userId), 'history', journalEntryId] as const,
  timeline: (userId?: string) =>
    [...journalReadKeys.user(userId), 'timeline'] as const,
  planner: (userId?: string, today?: string) =>
    [...journalReadKeys.user(userId), 'planner', today] as const,
  calendarRoot: (userId?: string) =>
    [...journalReadKeys.user(userId), 'calendar'] as const,
  calendar: (userId?: string, startDate?: string, endDate?: string) =>
    [...journalReadKeys.calendarRoot(userId), startDate, endDate] as const,
};

export type JournalInvalidationContext = {
  userId: string;
  mediaItemId: string;
  journalEntryId?: string;
  affectedDates?: string[];
};

function calendarKeyContainsDate(queryKey: QueryKey, dates: string[]) {
  const startDate = queryKey[4];
  const endDate = queryKey[5];

  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    return false;
  }

  return dates.some((date) => date >= startDate && date <= endDate);
}

/**
 * Refreshes only the v1.1 Journal surfaces that a title-level change can affect.
 * Calendar ranges are narrowed to ranges containing an affected user date.
 */
export async function invalidateJournalReadData(
  queryClient: QueryClient,
  context: JournalInvalidationContext,
) {
  const dates = [...new Set(context.affectedDates ?? [])].map((date) =>
    assertJournalDate(date, 'Affected date'),
  );

  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: journalReadKeys.titleSummary(context.userId, context.mediaItemId),
    }),
    queryClient.invalidateQueries({
      queryKey: journalReadKeys.timeline(context.userId),
    }),
    queryClient.invalidateQueries({
      queryKey: journalReadKeys.planner(context.userId),
    }),
  ];

  if (context.journalEntryId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: journalReadKeys.history(
          context.userId,
          context.journalEntryId,
        ),
      }),
    );
  }

  invalidations.push(
    queryClient.invalidateQueries(
      dates.length === 0
        ? { queryKey: journalReadKeys.calendarRoot(context.userId) }
        : {
            predicate: (query) =>
              calendarKeyContainsDate(query.queryKey, dates),
            queryKey: journalReadKeys.calendarRoot(context.userId),
          },
    ),
  );

  await Promise.all(invalidations);
}
