import { router, Stack } from 'expo-router';
import { View } from 'react-native';

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
    <Screen padded={false}>
      <Stack.Screen options={{ title: 'Watch history' }} />

      {detailsQuery.isLoading ? (
        <View className="px-5 pt-5">
          <LoadingState message="Loading title details" />
        </View>
      ) : null}

      {detailsQuery.isError ? (
        <View className="px-5 pt-5">
          <ErrorState
            message={errorMessage(
              detailsQuery.error,
              'Unable to load this title right now.',
            )}
            onRetry={() => detailsQuery.refetch()}
            title="History unavailable"
          />
        </View>
      ) : null}

      {!detailsQuery.isLoading && !detailsQuery.isError && !detailsQuery.data?.item ? (
        <View className="px-5 pt-5">
          <EmptyState
            message="This title is not available right now."
            title="Title not found"
          />
        </View>
      ) : null}

      {detailsQuery.data?.item && !user?.id ? (
        <View className="px-5 pt-5">
          <EmptyState
            actionLabel="Sign in"
            message="Sign in to view and manage your personal watch history."
            onAction={() => router.push('/welcome')}
            title="Sign in to view history"
          />
        </View>
      ) : null}

      {detailsQuery.data?.item && user?.id && journalQuery.isLoading ? (
        <View className="px-5 pt-5">
          <LoadingState message="Loading your history" />
        </View>
      ) : null}

      {detailsQuery.data?.item && user?.id && journalQuery.isError ? (
        <View className="px-5 pt-5">
          <ErrorState
            message={errorMessage(
              journalQuery.error,
              'Unable to load your history right now.',
            )}
            onRetry={() => journalQuery.refetch()}
            title="History unavailable"
          />
        </View>
      ) : null}

      {detailsQuery.data?.item && user?.id && journalQuery.isSuccess && !summary ? (
        <View className="px-5 pt-5">
          <EmptyState
            message="History is available after you record a watch for this title."
            title="No history yet"
          />
        </View>
      ) : null}

      {detailsQuery.data?.item && summary && user?.id ? (
        <JournalHistoryPanel
          media={detailsQuery.data.item}
          onEdit={(event) => openEventEdit(event.id)}
          summary={summary}
          userId={user.id}
        />
      ) : null}
    </Screen>
  );
}
