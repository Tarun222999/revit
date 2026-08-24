import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { Alert, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAppCapabilities } from '@/features/capabilities/context/AppCapabilitiesProvider';
import { TitleDetailsJournalActions } from '@/features/journal/components/TitleDetailsJournalActions';
import { JournalActionConfirmation } from '@/features/journal/components/JournalActionConfirmation';
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
import {
  TitleDetailsHero,
  TitleDetailsHeroLoading,
} from '@/features/media/components/TitleDetailsHero';
import { TitleDetailsMetadataCard } from '@/features/media/components/TitleDetailsMetadataCard';
import { TitleDetailsSummaryCard } from '@/features/media/components/TitleDetailsSummaryCard';
import { GameTitleDetailsContent } from '@/features/media/components/GameTitleDetailsContent';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';
import { useMediaTrailer } from '@/features/media/hooks/useMediaTrailer';
import {
  getGameDetailsModel,
  isGame,
} from '@/features/media/model/gameDetails';
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
  const { gamesEnabled } = useAppCapabilities();
  const detailsQuery = useMediaDetails(titleId);
  const item = detailsQuery.data?.item;
  const game = item && isGame(item) ? getGameDetailsModel(item) : null;
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
  const [removePlanConfirmationVisible, setRemovePlanConfirmationVisible] =
    useState(false);
  const [removeTitleConfirmationVisible, setRemoveTitleConfirmationVisible] =
    useState(false);
  const openedCaptureRef = useRef(false);

  const openJournalIntent = useCallback((
    action: JournalTitleAction,
    returnToJournal = false,
  ) => {
    if (!mediaItemId) {
      return;
    }

    // Game updates edit the latest owned play event. Unlike the old generic
    // resume route, this never fabricates a second `started` event just to
    // save a rating or note.
    if (item?.mediaType === 'game' && action.intent === 'edit_event') {
      const eventId =
        summary?.titleState.status === 'in_progress'
          ? summary.latestActivityEvent?.id
          : summary?.latestCompletedEvent?.id;

      if (eventId) {
        router.push({
          pathname: '/modals/journal-entry',
          params: {
            eventId,
            intent: 'edit_event',
            mediaItemId,
            source: 'history',
          },
        });
        return;
      }
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
  }, [item?.mediaType, mediaItemId, summary]);

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
    if (
      item.mediaType === 'game' &&
      summary?.titleState.status === 'in_progress' &&
      summary.latestActivityEvent?.type === 'started' &&
      mediaItemId
    ) {
      router.push({
        pathname: '/modals/journal-entry',
        params: {
          eventId: summary.latestActivityEvent.id,
          intent: 'edit_event',
          mediaItemId,
          source: 'history',
        },
      });
      return;
    }
    openJournalIntent(getJournalTitleActions(item.mediaType, summary).primary);
  };

  const openEditCompletedPlay = () => {
    const eventId = summary?.latestCompletedEvent?.id;
    if (!mediaItemId || !eventId) {
      openHistory();
      return;
    }

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

  const openJournalSummary = () => {
    if (!user?.id) {
      router.push('/welcome');
      return;
    }

    openRelevantJournalAction();
  };

  const confirmRemovePlan = () => {
    if (!summary?.titleState.activePlan) return;
    setRemovePlanConfirmationVisible(true);
  };

  const removePlanFromJournal = () => {
    if (!summary?.titleState.activePlan) return;
    void removePlan
      .mutateAsync({ journalEntryId: summary.titleState.id })
      .then(() => setRemovePlanConfirmationVisible(false))
      .catch((error) =>
        Alert.alert(
          'Could not remove plan',
          errorMessage(error, 'Try again in a moment.'),
        ),
      );
  };

  const confirmRemoveTitle = () => {
    if (!summary) return;
    setRemoveTitleConfirmationVisible(true);
  };

  const removeTitleFromJournal = () => {
    if (!summary) return;
    void removeTitle
      .mutateAsync({ journalEntryId: summary.titleState.id })
      .then(() => setRemoveTitleConfirmationVisible(false))
      .catch((error) =>
        Alert.alert(
          'Could not remove title',
          errorMessage(error, 'Try again in a moment.'),
        ),
      );
  };

  const openTrailer = async () => {
    const trailerKey = game?.trailerKey ?? trailerQuery.data?.trailer?.key;

    if (!trailerKey) {
      return;
    }

    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(trailerKey)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Trailer unavailable', 'Unable to open this trailer right now.');
    }
  };

  return (
    <Screen
      scroll
      padded={false}
      safeAreaEdges={['bottom']}
      className="bg-archive-900"
    >
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          headerTintColor: '#fbf6ec',
          headerTitle: '',
          headerTransparent: true,
        }}
      />

      <View>
        {detailsQuery.isLoading ? <TitleDetailsHeroLoading /> : null}

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
          <View className="-mt-8 gap-7 rounded-t-[32px] bg-archive-900 px-5 pb-28 pt-8">
            <TitleDetailsJournalActions
              addToListLoading={membershipsQuery.isLoading}
              canAddToList={Boolean(user?.id && mediaItemId)}
              canUseJournal={Boolean(
                user?.id &&
                  mediaItemId &&
                  journalQuery.isSuccess &&
                  (item.mediaType !== 'game' || gamesEnabled),
              )}
              isSignedIn={Boolean(user?.id)}
              mediaType={item.mediaType}
              onAddToList={() => setShowAddToListPanel(true)}
              onEditCompletedPlay={openEditCompletedPlay}
              onIntent={openJournalIntent}
              onRemovePlan={confirmRemovePlan}
              onRemoveTitle={confirmRemoveTitle}
              onSignIn={() => router.push('/welcome')}
              onWatchTrailer={openTrailer}
              removing={removePlan.isPending || removeTitle.isPending}
              showTrailer={Boolean(
                game?.trailerKey ?? trailerQuery.data?.trailer,
              )}
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
                mediaType={item.mediaType}
                onPress={
                  summary?.activityCount ? openHistory : openJournalSummary
                }
                summary={summary}
              />
            )}

            <TitleDetailsSummaryCard description={item.description} />
            {game ? (
              <GameTitleDetailsContent item={item} />
            ) : (
              <TitleDetailsMetadataCard details={getTitleDetailMetrics(item)} />
            )}
          </View>
        </>
      ) : null}

      <JournalActionConfirmation
        body="This removes only the active plan. Your activity history will stay intact."
        cancelLabel="Keep plan"
        confirmLabel="Remove plan"
        onCancel={() => setRemovePlanConfirmationVisible(false)}
        onConfirm={removePlanFromJournal}
        pending={removePlan.isPending}
        title="Remove plan?"
        visible={removePlanConfirmationVisible}
      />

      <JournalActionConfirmation
        body={
          summary
            ? `This permanently removes ${summary.activityCount} recorded ${summary.activityCount === 1 ? 'activity' : 'activities'}${summary.titleState.activePlan ? ' and its active plan' : ''}. Lists are not affected.`
            : ''
        }
        cancelLabel="Keep in Journal"
        confirmLabel="Remove from Journal"
        onCancel={() => setRemoveTitleConfirmationVisible(false)}
        onConfirm={removeTitleFromJournal}
        pending={removeTitle.isPending}
        title="Remove from Journal?"
        visible={removeTitleConfirmationVisible}
      />
    </Screen>
  );
}
