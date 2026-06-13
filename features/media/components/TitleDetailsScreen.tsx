import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { YourEntrySummary } from '@/features/journal/components/YourEntrySummary';
import { useJournalEntryForMedia } from '@/features/journal/hooks/useJournalEntryForMedia';
import { AddToListPanel } from '@/features/lists/components/AddToListPanel';
import { useMediaListMemberships } from '@/features/lists/hooks/useMediaListMemberships';
import { TitleDetailsActions } from '@/features/media/components/TitleDetailsActions';
import { TitleDetailsHero } from '@/features/media/components/TitleDetailsHero';
import { TitleDetailsMetadataCard } from '@/features/media/components/TitleDetailsMetadataCard';
import { TitleDetailsSummaryCard } from '@/features/media/components/TitleDetailsSummaryCard';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';
import { getTitleDetailMetrics } from '@/features/media/model/titleDetails';

type TitleDetailsScreenProps = {
  titleId?: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function TitleDetailsScreen({ titleId }: TitleDetailsScreenProps) {
  const { user } = useAuth();
  const detailsQuery = useMediaDetails(titleId);
  const item = detailsQuery.data?.item;
  const mediaItemId = item?.id;
  const entryQuery = useJournalEntryForMedia(user?.id, mediaItemId);
  const membershipsQuery = useMediaListMemberships(user?.id, mediaItemId);
  const entry = entryQuery.data ?? null;
  const [showAddToListPanel, setShowAddToListPanel] = useState(false);

  const openJournalEntry = () => {
    if (!mediaItemId) {
      return;
    }

    router.push({
      pathname: '/modals/journal-entry',
      params: {
        mediaItemId,
        ...(entry?.id ? { entryId: entry.id } : {}),
      },
    });
  };

  return (
    <Screen scroll className="gap-5">
      <Stack.Screen options={{ title: item?.title ?? 'Details' }} />

      {detailsQuery.isLoading ? (
        <LoadingState message="Loading title details" />
      ) : null}

      {detailsQuery.isError ? (
        <ErrorState
          title="Details failed"
          message={errorMessage(
            detailsQuery.error,
            'Unable to load this title right now.',
          )}
          onRetry={() => detailsQuery.refetch()}
        />
      ) : null}

      {!detailsQuery.isLoading && !detailsQuery.isError && !item ? (
        <EmptyState
          title="Title not found"
          message="This title is not available right now."
        />
      ) : null}

      {item ? (
        <>
          <TitleDetailsHero item={item} />
          <TitleDetailsSummaryCard description={item.description} />

          {entryQuery.isError ? (
            <ErrorState
              title="Journal entry unavailable"
              message={errorMessage(
                entryQuery.error,
                'Unable to load your journal entry for this title.',
              )}
              onRetry={() => entryQuery.refetch()}
            />
          ) : (
            <YourEntrySummary entry={entry} />
          )}

          <TitleDetailsActions
            addToListLoading={membershipsQuery.isLoading}
            canOpenJournalEntry={Boolean(mediaItemId)}
            canOpenLists={Boolean(user?.id && mediaItemId)}
            entry={entry}
            journalEntryLoading={entryQuery.isLoading}
            onOpenAddToList={() => setShowAddToListPanel((visible) => !visible)}
            onOpenJournalEntry={openJournalEntry}
            showAddToListPanel={showAddToListPanel}
          />

          {showAddToListPanel && user?.id && mediaItemId ? (
            <AddToListPanel
              mediaItemId={mediaItemId}
              userId={user.id}
              onClose={() => setShowAddToListPanel(false)}
            />
          ) : null}

          <TitleDetailsMetadataCard details={getTitleDetailMetrics(item)} />
        </>
      ) : null}
    </Screen>
  );
}
