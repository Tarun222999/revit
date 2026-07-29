import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteJournalEvent,
  logJournalEvent,
  removeJournalPlan,
  removeJournalTitle,
  saveJournalPlan,
  updateJournalEvent,
} from '@/features/journal/api/journal-mutation-api';
import { invalidateJournalReadData } from '@/features/journal/api/journal-query-keys';
import { journalEntriesQueryKey } from '@/features/journal/hooks/useJournalEntryForMedia';
import type {
  DeleteJournalEventInput,
  JournalMutationResult,
  LogJournalEventInput,
  RemoveJournalPlanInput,
  RemoveJournalTitleInput,
  SaveJournalPlanInput,
  UpdateJournalEventInput,
} from '@/features/journal/types';

function useJournalLifecycleMutation<TInput>(
  mutationFn: (input: TInput) => Promise<JournalMutationResult>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      await Promise.all([
        invalidateJournalReadData(queryClient, {
          affectedDates: result.affectedDates,
          journalEntryId: result.journalEntryId,
          mediaItemId: result.mediaItemId,
          userId: result.userId,
        }),
        // Preserve staged compatibility until the later screen migration steps.
        queryClient.invalidateQueries({
          queryKey: journalEntriesQueryKey(result.userId),
        }),
      ]);
    },
  });
}

export function useSaveJournalPlan() {
  return useJournalLifecycleMutation<SaveJournalPlanInput>(saveJournalPlan);
}

export function useRemoveJournalPlan() {
  return useJournalLifecycleMutation<RemoveJournalPlanInput>(removeJournalPlan);
}

export function useLogJournalEvent() {
  return useJournalLifecycleMutation<LogJournalEventInput>(logJournalEvent);
}

export function useUpdateJournalEvent() {
  return useJournalLifecycleMutation<UpdateJournalEventInput>(updateJournalEvent);
}

export function useDeleteJournalEvent() {
  return useJournalLifecycleMutation<DeleteJournalEventInput>(deleteJournalEvent);
}

export function useRemoveJournalTitle() {
  return useJournalLifecycleMutation<RemoveJournalTitleInput>(removeJournalTitle);
}
