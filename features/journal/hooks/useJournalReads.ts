import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  getJournalCalendarRange,
  getJournalEvent,
  getJournalHistoryPage,
  getJournalPlanner,
  getJournalTimelinePage,
  getJournalTitleSummary,
} from '@/features/journal/api/journal-read-api';
import { journalReadKeys } from '@/features/journal/api/journal-query-keys';
import type {
  JournalEventCursor,
  JournalHistoryPage,
  JournalTimelinePage,
} from '@/features/journal/types';

export function useJournalTitleSummary(
  userId?: string,
  mediaItemId?: string,
) {
  const query = useQuery({
    enabled: Boolean(userId && mediaItemId),
    queryFn: () =>
      getJournalTitleSummary({
        mediaItemId: mediaItemId ?? '',
        userId: userId ?? '',
      }),
    queryKey: journalReadKeys.titleSummary(userId, mediaItemId),
  });

  return {
    ...query,
    // A missing row is actionable only after a successful, authoritative read.
    canCreateTitleState: query.isSuccess && query.data === null,
  };
}

export function useJournalHistory(
  userId?: string,
  journalEntryId?: string,
) {
  return useInfiniteQuery({
    enabled: Boolean(userId && journalEntryId),
    getNextPageParam: (lastPage: JournalHistoryPage) =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      getJournalHistoryPage({
        cursor: pageParam as JournalEventCursor | null,
        journalEntryId: journalEntryId ?? '',
        userId: userId ?? '',
      }),
    queryKey: journalReadKeys.history(userId, journalEntryId),
  });
}

export function useJournalEvent(userId?: string, eventId?: string) {
  return useQuery({
    enabled: Boolean(userId && eventId),
    queryFn: () =>
      getJournalEvent({ eventId: eventId ?? '', userId: userId ?? '' }),
    queryKey: journalReadKeys.event(userId, eventId),
  });
}

export function useJournalTimeline(userId?: string) {
  return useInfiniteQuery({
    enabled: Boolean(userId),
    getNextPageParam: (lastPage: JournalTimelinePage) =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      getJournalTimelinePage({
        cursor: pageParam as JournalEventCursor | null,
        userId: userId ?? '',
      }),
    queryKey: journalReadKeys.timeline(userId),
  });
}

export function useJournalPlanner(userId?: string, today?: string) {
  return useQuery({
    enabled: Boolean(userId && today),
    queryFn: () =>
      getJournalPlanner({ today: today ?? '', userId: userId ?? '' }),
    queryKey: journalReadKeys.planner(userId, today),
  });
}

export function useJournalCalendarRange(
  userId?: string,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    enabled: Boolean(userId && startDate && endDate),
    queryFn: () =>
      getJournalCalendarRange({
        endDate: endDate ?? '',
        startDate: startDate ?? '',
        userId: userId ?? '',
      }),
    queryKey: journalReadKeys.calendar(userId, startDate, endDate),
  });
}
