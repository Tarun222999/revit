import { useQuery } from '@tanstack/react-query';

import { getJournalEntries } from '@/features/journal/api/journal-api';
import { journalEntriesQueryKey } from '@/features/journal/hooks/useJournalEntryForMedia';

export function useJournalEntries(userId?: string) {
  return useQuery({
    queryKey: journalEntriesQueryKey(userId),
    queryFn: () => getJournalEntries(userId ?? ''),
    enabled: Boolean(userId),
  });
}
