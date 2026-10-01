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
import { usePublicTitleDetails } from '@/features/media/hooks/usePublicTitleDetails';
import { useMediaTrailer } from '@/features/media/hooks/useMediaTrailer';
import { PublicTitleUnavailableError } from '@/features/media/api/public-title-api';
import { TitleDetailsOverflow } from '@/features/media/components/TitleDetailsOverflow';
import {
  getGameDetailsModel,
  isGame,
} from '@/features/media/model/gameDetails';
import { getTitleDetailMetrics } from '@/features/media/model/titleDetails';
import {
  createTitleShareUrl,
  getPotentialTitleShareId,
} from '@/features/sharing/model/titleShare';

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
  const publicTitleRequestId = getPotentialTitleShareId(titleId);
  const authenticatedDetailsQuery = useMediaDetails(user?.id ? titleId : undefined);
  const publicDetailsQuery = usePublicTitleDetails(
    !user?.id ? publicTitleRequestId : undefined,
  );
  const detailsQuery = user?.id ? authenticatedDetailsQuery : publicDetailsQuery;
  const item = detailsQuery.data?.item;
  const canUseTitleMutations = Boolean(
    item && (item.mediaType !== 'game' || gamesEnabled),
  );
  const game = item && isGame(item) ? getGameDetailsModel(item) : null;
  const trailerQuery = useMediaTrailer(
    user?.id && item?.source === 'tmdb' ? item.sourceId : undefined,
  );
  const mediaItemId = user?.id && item && 'id' in item ? item.id : undefined;
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

  useEffect(() => {
    if (!canUseTitleMutations) {
      setShowAddToListPanel(false);
    }
  }, [canUseTitleMutations]);

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
      !canUseTitleMutations ||
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
    canUseTitleMutations,
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
      const returnTo = item ? createTitleShareUrl(item) : undefined;
      router.push({
        pathname: '/welcome',
        params: returnTo ? { returnTo } : {},
      });
      return;
    }

    openRelevantJournalAction();
  };

  const journalSummaryAction = !user?.id
    ? openJournalSummary
    : summary?.activityCount
      ? openHistory
      : canUseTitleMutations
        ? openJournalSummary
        : undefined;

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
          headerRight: () => item ? <TitleDetailsOverflow item={item} /> : null,
        }}
      />

      <View>
        {detailsQuery.isLoading ? <TitleDetailsHeroLoading /> : null}

        {detailsQuery.isError && detailsQuery.error instanceof PublicTitleUnavailableError ? (
          <EmptyState
            actionLabel="Retry"
            message="It may not have been added to Revit yet."
            onAction={() => detailsQuery.refetch()}
            title="This title isn't available in Revit yet"
          />
        ) : null}

        {detailsQuery.isError && !(detailsQuery.error instanceof PublicTitleUnavailableError) ? (
          <ErrorState
            title={user?.id ? 'Details failed' : 'Shared title unavailable'}
            message={errorMessage(
              detailsQuery.error,
              user?.id
                ? 'Unable to load this title right now.'
                : 'Unable to load this shared title right now. Check your connection and try again.',
            )}
            onRetry={() => detailsQuery.refetch()}
          />
        ) : null}

        {!detailsQuery.isLoading && !detailsQuery.isError && !item ? (
          <EmptyState
            title={user?.id ? 'Title not found' : "This title isn't available in Revit yet"}
            message={user?.id ? 'This title is not available right now.' : 'It may not have been added to Revit yet.'}
          />
        ) : null}
      </View>

      {item ? (
        <>
          <TitleDetailsHero item={item} />
          <View className="-mt-8 gap-7 rounded-t-[32px] bg-archive-900 px-5 pb-28 pt-8">
            <TitleDetailsJournalActions
              addToListLoading={membershipsQuery.isLoading}
              canAddToList={Boolean(
                user?.id &&
                  mediaItemId &&
                  canUseTitleMutations,
              )}
              canUseJournal={Boolean(
                user?.id &&
                  mediaItemId &&
                  journalQuery.isSuccess &&
                  canUseTitleMutations,
              )}
              isSignedIn={Boolean(user?.id)}
              mediaType={item.mediaType}
              onAddToList={() => setShowAddToListPanel(true)}
              onEditCompletedPlay={openEditCompletedPlay}
              onIntent={openJournalIntent}
              onRemovePlan={confirmRemovePlan}
              onRemoveTitle={confirmRemoveTitle}
              onSignIn={openJournalSummary}
              onWatchTrailer={openTrailer}
              removing={removePlan.isPending || removeTitle.isPending}
              showTrailer={Boolean(
                game?.trailerKey ?? trailerQuery.data?.trailer,
              )}
              summary={summary}
            />

            {showAddToListPanel &&
            user?.id &&
            mediaItemId &&
            canUseTitleMutations ? (
              <AddToListPanel
                mediaItemId={mediaItemId}
                mediaSource={item.source}
                mediaSourceId={item.sourceId}
                userId={user.id}
                onClose={() => setShowAddToListPanel(false)}
              />
            ) : null}

            {user?.id ? (
              journalQuery.isLoading ? (
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
                <YourJournalSummary
                  mediaType={item.mediaType}
                  disabled={Boolean(!journalQuery.isSuccess || !journalSummaryAction)}
                  onPress={journalSummaryAction}
                  summary={summary}
                />
              )
            ) : null}

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
