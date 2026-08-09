import { router, Stack } from 'expo-router';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { JournalHistoryPanel } from '@/features/journal/components/JournalHistoryPanel';
import { useJournalTitleSummary } from '@/features/journal/hooks/useJournalReads';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function JournalHistoryScreen({ titleId }: { titleId?: string }) {
  const { user } = useAuth();
  const detailsQuery = useMediaDetails(titleId);
  const mediaItemId = detailsQuery.data?.item.id;
  const journalQuery = useJournalTitleSummary(user?.id, mediaItemId);
  const summary = journalQuery.data ?? null;

  const openEventEdit = (eventId: string) => {
    if (!mediaItemId) return;

    router.push({
      pathname: '/modals/journal-entry',
      params: {
        eventId,
        intent: 'edit_event',
        mediaItemId,
        source: 'history',
      },
    });
  };

  return (
    <Screen scroll className="gap-5">
      <Stack.Screen options={{ title: 'Watch history' }} />

      {detailsQuery.isLoading ? (
        <LoadingState message="Loading title details" />
      ) : null}

      {detailsQuery.isError ? (
        <ErrorState
          message={errorMessage(
            detailsQuery.error,
            'Unable to load this title right now.',
          )}
          onRetry={() => detailsQuery.refetch()}
          title="History unavailable"
        />
      ) : null}

      {!detailsQuery.isLoading && !detailsQuery.isError && !detailsQuery.data?.item ? (
        <EmptyState
          message="This title is not available right now."
          title="Title not found"
        />
      ) : null}

      {detailsQuery.data?.item && journalQuery.isLoading ? (
        <LoadingState message="Loading your history" />
      ) : null}

      {detailsQuery.data?.item && journalQuery.isError ? (
        <ErrorState
          message={errorMessage(
            journalQuery.error,
            'Unable to load your history right now.',
          )}
          onRetry={() => journalQuery.refetch()}
          title="History unavailable"
        />
      ) : null}

      {detailsQuery.data?.item && journalQuery.isSuccess && !summary ? (
        <EmptyState
          message="History is available after you record a watch for this title."
          title="No history yet"
        />
      ) : null}

      {summary && user?.id ? (
        <JournalHistoryPanel
          onEdit={(event) => openEventEdit(event.id)}
          summary={summary}
          userId={user.id}
        />
      ) : null}
    </Screen>
  );
}
