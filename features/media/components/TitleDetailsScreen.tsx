import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { Alert } from 'react-native';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { JournalHistoryPanel } from '@/features/journal/components/JournalHistoryPanel';
import { TitleDetailsJournalActions } from '@/features/journal/components/TitleDetailsJournalActions';
import { YourJournalSummary } from '@/features/journal/components/YourJournalSummary';
import {
  useRemoveJournalPlan,
  useRemoveJournalTitle,
} from '@/features/journal/hooks/useJournalLifecycleMutations';
import { useJournalTitleSummary } from '@/features/journal/hooks/useJournalReads';
import type { JournalTitleAction } from '@/features/journal/model/journalTitleActions';
import { AddToListPanel } from '@/features/lists/components/AddToListPanel';
import { useMediaListMemberships } from '@/features/lists/hooks/useMediaListMemberships';
import { TitleDetailsHero } from '@/features/media/components/TitleDetailsHero';
import { TitleDetailsMetadataCard } from '@/features/media/components/TitleDetailsMetadataCard';
import { TitleDetailsSummaryCard } from '@/features/media/components/TitleDetailsSummaryCard';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';
import { useMediaTrailer } from '@/features/media/hooks/useMediaTrailer';
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
  const trailerQuery = useMediaTrailer(
    item?.source === 'tmdb' ? item.sourceId : undefined,
  );
  const mediaItemId = item?.id;
  const journalQuery = useJournalTitleSummary(user?.id, mediaItemId);
  const removePlan = useRemoveJournalPlan();
  const removeTitle = useRemoveJournalTitle();
  const membershipsQuery = useMediaListMemberships(user?.id, mediaItemId);
  const summary = journalQuery.data ?? null;
  const [showAddToListPanel, setShowAddToListPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const openJournalIntent = (action: JournalTitleAction) => {
    if (!mediaItemId) {
      return;
    }

    router.push({
      pathname: '/modals/journal-entry',
      params: {
        intent: action.intent,
        mediaItemId,
        source: action.source,
      },
    });
  };

  const openEventEdit = (eventId: string) => {
    if (!mediaItemId) return;
    router.push({
      pathname: '/modals/journal-entry',
      params: { eventId, intent: 'edit_event', mediaItemId, source: 'history' },
    });
  };

  const confirmRemovePlan = () => {
    if (!summary?.titleState.activePlan) return;
    Alert.alert(
      'Remove plan?',
      'This removes only the active plan. Your activity history will stay intact.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Remove plan',
          onPress: () => {
            void removePlan
              .mutateAsync({ journalEntryId: summary.titleState.id })
              .catch((error) =>
                Alert.alert(
                  'Could not remove plan',
                  errorMessage(error, 'Try again in a moment.'),
                ),
              );
          },
        },
      ],
    );
  };

  const confirmRemoveTitle = () => {
    if (!summary) return;
    const planText = summary.titleState.activePlan ? ' and its active plan' : '';
    Alert.alert(
      'Remove from Journal?',
      `This permanently removes ${summary.activityCount} dated ${summary.activityCount === 1 ? 'activity' : 'activities'}${planText}. Lists are not affected.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Remove from Journal',
          onPress: () => {
            void removeTitle
              .mutateAsync({ journalEntryId: summary.titleState.id })
              .then(() => setShowHistory(false))
              .catch((error) =>
                Alert.alert(
                  'Could not remove title',
                  errorMessage(error, 'Try again in a moment.'),
                ),
              );
          },
        },
      ],
    );
  };

  const openTrailer = async () => {
    const trailer = trailerQuery.data?.trailer;

    if (!trailer) {
      return;
    }

    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Trailer unavailable', 'Unable to open this trailer right now.');
    }
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

          {journalQuery.isLoading ? (
            <LoadingState message="Loading your Journal" />
          ) : journalQuery.isError ? (
            <ErrorState
              title="Journal unavailable"
              message={errorMessage(
                journalQuery.error,
                'Unable to load your Journal information for this title.',
              )}
              onRetry={() => journalQuery.refetch()}
            />
          ) : (
            <YourJournalSummary summary={summary} />
          )}

          <TitleDetailsJournalActions
            addToListLoading={membershipsQuery.isLoading}
            canAddToList={Boolean(user?.id && mediaItemId)}
            canUseJournal={Boolean(
              user?.id && mediaItemId && journalQuery.isSuccess,
            )}
            mediaType={item.mediaType}
            onAddToList={() => setShowAddToListPanel(true)}
            onIntent={openJournalIntent}
            onRemovePlan={confirmRemovePlan}
            onRemoveTitle={confirmRemoveTitle}
            onToggleHistory={() => setShowHistory((current) => !current)}
            onWatchTrailer={openTrailer}
            removing={removePlan.isPending || removeTitle.isPending}
            showTrailer={Boolean(trailerQuery.data?.trailer)}
            summary={summary}
          />

          {showHistory && summary && user?.id ? (
            <JournalHistoryPanel
              onEdit={(event) => openEventEdit(event.id)}
              summary={summary}
              userId={user.id}
            />
          ) : null}

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
