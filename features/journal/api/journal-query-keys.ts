import type { QueryClient } from '@tanstack/react-query';

import { assertJournalDate } from '@/features/journal/model/journalReadModels';
import type { JournalPlannerItem } from '@/features/journal/types';

export const journalReadKeys = {
  all: ['journal', 'v1.1'] as const,
  user: (userId?: string) => [...journalReadKeys.all, userId] as const,
  titleState: (userId?: string, mediaItemId?: string) =>
    [...journalReadKeys.user(userId), 'title-state', mediaItemId] as const,
  titleSummary: (userId?: string, mediaItemId?: string) =>
    [...journalReadKeys.user(userId), 'title-summary', mediaItemId] as const,
  history: (userId?: string, journalEntryId?: string) =>
    [...journalReadKeys.user(userId), 'history', journalEntryId] as const,
  event: (userId?: string, eventId?: string) =>
    [...journalReadKeys.user(userId), 'event', eventId] as const,
  timeline: (userId?: string) =>
    [...journalReadKeys.user(userId), 'timeline'] as const,
  planner: (userId?: string, today?: string) =>
    today === undefined
      ? ([...journalReadKeys.user(userId), 'planner'] as const)
      : ([...journalReadKeys.user(userId), 'planner', today] as const),
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
  eventId?: string | null;
};

/**
 * Removes a server-confirmed resolved title from every cached Planner day.
 *
 * Planner queries include the device-local `today` in their key, so updating
 * only the currently visible key leaves another cached day stale. The
 * user-scoped partial key updates all Planner variants without touching
 * another account's cache.
 */
export function reconcileJournalPlannerCache(
  queryClient: QueryClient,
  context: Pick<
    JournalInvalidationContext,
    'journalEntryId' | 'mediaItemId' | 'userId'
  >,
) {
  queryClient.setQueriesData<JournalPlannerItem[]>(
    { queryKey: journalReadKeys.planner(context.userId) },
    (items) =>
      items?.filter(
        (item) =>
          item.titleState.id !== context.journalEntryId &&
          item.media.id !== context.mediaItemId,
      ),
  );
}

/**
 * Refreshes v1.1 Journal surfaces after an atomic lifecycle change.
 *
 * Calendar ranges are deliberately invalidated as a group. A committed
 * mutation whose response is lost can be retried after its previous plan or
 * event date is no longer recoverable from current database state. Refreshing
 * every bounded Calendar query prevents stale markers in those ambiguous cases.
 */
export async function invalidateJournalReadData(
  queryClient: QueryClient,
  context: JournalInvalidationContext,
) {
  [...new Set(context.affectedDates ?? [])].map((date) =>
    assertJournalDate(date, 'Affected date'),
  );

  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: journalReadKeys.titleSummary(
        context.userId,
        context.mediaItemId,
      ),
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

  if (context.eventId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: journalReadKeys.event(context.userId, context.eventId),
      }),
    );
  }

  invalidations.push(
    queryClient.invalidateQueries({
      queryKey: journalReadKeys.calendarRoot(context.userId),
    }),
  );

  await Promise.all(invalidations);
}
