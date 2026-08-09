import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteJournalEvent,
  logJournalEvent,
  removeJournalPlan,
  removeJournalTitle,
  saveJournalPlan,
  updateJournalEvent,
} from '@/features/journal/api/journal-mutation-api';
import {
  invalidateJournalReadData,
  reconcileJournalPlannerCache,
} from '@/features/journal/api/journal-query-keys';
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
  shouldRemoveFromPlanner: (
    input: TInput,
    result: JournalMutationResult,
  ) => boolean = () => false,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (result, input) => {
      if (shouldRemoveFromPlanner(input, result)) {
        reconcileJournalPlannerCache(queryClient, {
          journalEntryId: result.journalEntryId,
          mediaItemId: result.mediaItemId,
          userId: result.userId,
        });
      }

      await Promise.all([
        invalidateJournalReadData(queryClient, {
          affectedDates: result.affectedDates,
          eventId: result.eventId,
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
  return useJournalLifecycleMutation<RemoveJournalPlanInput>(
    removeJournalPlan,
    () => true,
  );
}

export function useLogJournalEvent() {
  return useJournalLifecycleMutation<LogJournalEventInput>(
    logJournalEvent,
    (input) => input.source === 'planner' || input.source === 'planned_title',
  );
}

export function useUpdateJournalEvent() {
  return useJournalLifecycleMutation<UpdateJournalEventInput>(
    updateJournalEvent,
  );
}

export function useDeleteJournalEvent() {
  return useJournalLifecycleMutation<DeleteJournalEventInput>(
    deleteJournalEvent,
    (_input, result) => result.titleDeleted,
  );
}

export function useRemoveJournalTitle() {
  return useJournalLifecycleMutation<RemoveJournalTitleInput>(
    removeJournalTitle,
    (_input, result) => result.titleDeleted,
  );
}
