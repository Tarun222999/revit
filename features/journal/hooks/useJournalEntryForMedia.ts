import { useQuery } from '@tanstack/react-query';

import { getJournalEntryForMedia } from '@/features/journal/api/journal-api';

export const journalEntriesQueryKey = (userId?: string) =>
  ['journal', 'entries', userId] as const;

export const journalEntryForMediaQueryKey = (
  userId?: string,
  mediaItemId?: string,
) => [...journalEntriesQueryKey(userId), 'media', mediaItemId] as const;

export function useJournalEntryForMedia(
  userId?: string,
  mediaItemId?: string,
) {
  return useQuery({
    queryKey: journalEntryForMediaQueryKey(userId, mediaItemId),
    queryFn: () =>
      getJournalEntryForMedia({
        mediaItemId: mediaItemId ?? '',
        userId: userId ?? '',
      }),
    enabled: Boolean(userId && mediaItemId),
  });
}
