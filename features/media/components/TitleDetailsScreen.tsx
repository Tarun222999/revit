import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { Alert, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TitleDetailsJournalActions } from '@/features/journal/components/TitleDetailsJournalActions';
import { YourJournalSummary } from '@/features/journal/components/YourJournalSummary';
import {
  useRemoveJournalPlan,
  useRemoveJournalTitle,
} from '@/features/journal/hooks/useJournalLifecycleMutations';
import { useJournalTitleSummary } from '@/features/journal/hooks/useJournalReads';
import {
  getJournalTitleActions,
  type JournalTitleAction,
} from '@/features/journal/model/journalTitleActions';
import { resolveJournalCaptureAction } from '@/features/journal/model/journalNavigation';
import { AddToListPanel } from '@/features/lists/components/AddToListPanel';
import { useMediaListMemberships } from '@/features/lists/hooks/useMediaListMemberships';
import { TitleDetailsHero } from '@/features/media/components/TitleDetailsHero';
import { TitleDetailsMetadataCard } from '@/features/media/components/TitleDetailsMetadataCard';
import { TitleDetailsSummaryCard } from '@/features/media/components/TitleDetailsSummaryCard';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';
import { useMediaTrailer } from '@/features/media/hooks/useMediaTrailer';
import { getTitleDetailMetrics } from '@/features/media/model/titleDetails';

type TitleDetailsScreenProps = {
  journalCapture?: string;
  journalReturn?: boolean;
  titleId?: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function TitleDetailsScreen({
  journalCapture,
  journalReturn = false,
  titleId,
}: TitleDetailsScreenProps) {
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
  const openedCaptureRef = useRef(false);

  const openJournalIntent = useCallback((
    action: JournalTitleAction,
    returnToJournal = false,
  ) => {
    if (!mediaItemId) {
      return;
    }

    router.push({
      pathname: '/modals/journal-entry',
      params: {
        intent: action.intent,
        mediaItemId,
        ...(returnToJournal ? { returnToJournal: 'true' } : {}),
        source: action.source,
      },
    });
  }, [mediaItemId]);

  useEffect(() => {
    if (
      openedCaptureRef.current ||
      !journalReturn ||
      (journalCapture !== 'log' && journalCapture !== 'plan') ||
      !item ||
      !mediaItemId ||
      !journalQuery.isSuccess
    ) {
      return;
    }

    const action = resolveJournalCaptureAction(
      journalCapture,
      item.mediaType,
      summary,
    );

    openedCaptureRef.current = true;
    openJournalIntent(action, true);
  }, [
    item,
    journalCapture,
    journalQuery.isSuccess,
    journalReturn,
    mediaItemId,
    openJournalIntent,
    summary,
  ]);

  const openHistory = () => {
    if (!titleId || !summary?.activityCount) return;
    router.push(`/title/${encodeURIComponent(titleId)}/history`);
  };

  const openRelevantJournalAction = () => {
    if (!item) return;
    openJournalIntent(getJournalTitleActions(item.mediaType, summary).primary);
  };

  const openJournalSummary = () => {
    if (!user?.id) {
      router.push('/welcome');
      return;
    }

    openRelevantJournalAction();
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
      `This permanently removes ${summary.activityCount} recorded ${summary.activityCount === 1 ? 'activity' : 'activities'}${planText}. Lists are not affected.`,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Remove from Journal',
          onPress: () => {
            void removeTitle
              .mutateAsync({ journalEntryId: summary.titleState.id })
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
    <Screen scroll padded={false} className="bg-archive-900">
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          headerTintColor: '#fbf6ec',
          headerTitle: '',
          headerTransparent: true,
        }}
      />

      <View className="px-5 pt-6">
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
      </View>

      {item ? (
        <>
          <TitleDetailsHero item={item} />
          <View className="gap-7 px-5 pb-28 pt-5">
            <TitleDetailsJournalActions
              addToListLoading={membershipsQuery.isLoading}
              canAddToList={Boolean(user?.id && mediaItemId)}
              canUseJournal={Boolean(
                user?.id && mediaItemId && journalQuery.isSuccess,
              )}
              isSignedIn={Boolean(user?.id)}
              mediaType={item.mediaType}
              onAddToList={() => setShowAddToListPanel(true)}
              onIntent={openJournalIntent}
              onOpenHistory={openHistory}
              onRemovePlan={confirmRemovePlan}
              onRemoveTitle={confirmRemoveTitle}
              onSignIn={() => router.push('/welcome')}
              onWatchTrailer={openTrailer}
              removing={removePlan.isPending || removeTitle.isPending}
              showTrailer={Boolean(trailerQuery.data?.trailer)}
              summary={summary}
            />

            {showAddToListPanel && user?.id && mediaItemId ? (
              <AddToListPanel
                mediaItemId={mediaItemId}
                userId={user.id}
                onClose={() => setShowAddToListPanel(false)}
              />
            ) : null}

            {user?.id && journalQuery.isLoading ? (
              <LoadingState message="Loading your Journal" />
            ) : user?.id && journalQuery.isError ? (
              <ErrorState
                title="Journal unavailable"
                message={errorMessage(
                  journalQuery.error,
                  'Unable to load your Journal information for this title.',
                )}
                onRetry={() => journalQuery.refetch()}
              />
            ) : (
              <YourJournalSummary
                disabled={Boolean(user?.id && !journalQuery.isSuccess)}
                onPress={summary?.activityCount ? openHistory : openJournalSummary}
                summary={summary}
              />
            )}

            <TitleDetailsSummaryCard description={item.description} />
            <TitleDetailsMetadataCard details={getTitleDetailMetrics(item)} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
