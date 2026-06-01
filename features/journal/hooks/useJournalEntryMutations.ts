import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
} from '@/features/journal/api/journal-api';
import {
  journalEntriesQueryKey,
  journalEntryForMediaQueryKey,
} from '@/features/journal/hooks/useJournalEntryForMedia';
import type {
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '@/features/journal/types';

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) => createJournalEntry(input),
    onSuccess: (entry) => {
      queryClient.setQueryData(
        journalEntryForMediaQueryKey(entry.user_id, entry.media_item_id),
        entry,
      );
      queryClient.invalidateQueries({
        queryKey: journalEntriesQueryKey(entry.user_id),
      });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateJournalEntryInput) => updateJournalEntry(input),
    onSuccess: (entry) => {
      queryClient.setQueryData(
        journalEntryForMediaQueryKey(entry.user_id, entry.media_item_id),
        entry,
      );
      queryClient.invalidateQueries({
        queryKey: journalEntriesQueryKey(entry.user_id),
      });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => deleteJournalEntry(entryId),
    onSuccess: (entry) => {
      queryClient.setQueryData(
        journalEntryForMediaQueryKey(entry.user_id, entry.media_item_id),
        null,
      );
      queryClient.invalidateQueries({
        queryKey: journalEntriesQueryKey(entry.user_id),
      });
    },
  });
}
