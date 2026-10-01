import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { JournalActionConfirmation } from '@/features/journal/components/JournalActionConfirmation';
import { JournalActionFeedback } from '@/features/journal/components/JournalActionFeedback';
import {
  formatJournalHistoryDate,
  getJournalHistoryEventLabel,
  JournalHistoryRow,
} from '@/features/journal/components/JournalHistoryRow';
import { useDeleteJournalEvent } from '@/features/journal/hooks/useJournalLifecycleMutations';
import { useJournalHistory } from '@/features/journal/hooks/useJournalReads';
import type { JournalEvent, JournalTitleSummary } from '@/features/journal/types';
import type { NormalizedMediaItem } from '@/types/media';

type DeleteRequest = {
  event: JournalEvent;
  finalEvent: boolean;
  emptyTitleAction?: 'keep_someday' | 'remove';
};

function HistoryHeader({
  canRecordActivity,
  media,
  summary,
}: {
  canRecordActivity: boolean;
  media: NormalizedMediaItem;
  summary: JournalTitleSummary;
}) {
  const latestDate = summary.latestCompletedEvent
    ? formatJournalHistoryDate(summary.latestCompletedEvent.eventDate)
    : `No completed ${media.mediaType === 'game' ? 'play' : 'watch'} yet`;
  const isGame = media.mediaType === 'game';

  const addPreviousWatch = () => {
    router.push({
      pathname: '/modals/journal-entry',
      params: {
        intent: 'previous_watch',
        mediaItemId: media.id,
        source: 'history',
      },
    });
  };

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3 rounded-app border border-archive-700 bg-archive-800 p-4">
        <MediaPoster imageUrl={media.imageUrl} size="sm" />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-lg font-bold text-archive-50" numberOfLines={2}>
            {media.title}
          </Text>
          <Text className="text-sm text-archive-300">Latest {isGame ? 'play' : 'watch'} · {latestDate}</Text>
        </View>
        <View className="items-end">
          <Text className="text-2xl font-bold text-gold-300">
            {summary.completedWatchCount}
          </Text>
          <Text className="text-xs text-archive-300">{isGame ? 'plays' : 'watches'}</Text>
        </View>
      </View>

      {canRecordActivity ? (
        <Button
          onPress={addPreviousWatch}
          title={isGame ? 'Log another play' : 'Log another watch'}
          variant="secondary"
        />
      ) : null}

      <View className="flex-row items-baseline justify-between px-1 pt-2">
        <Text className="text-lg font-bold text-archive-50">All activity</Text>
        <Text className="text-xs text-archive-300">Newest first</Text>
      </View>
    </View>
  );
}

export function JournalHistoryPanel({
  canRecordActivity = true,
  media,
  onEdit,
  summary,
  userId,
}: {
  canRecordActivity?: boolean;
  media: NormalizedMediaItem;
  onEdit: (event: JournalEvent) => void;
  summary: JournalTitleSummary;
  userId: string;
}) {
  const query = useJournalHistory(userId, summary.titleState.id);
  const deleteEvent = useDeleteJournalEvent();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [retryRequest, setRetryRequest] = useState<DeleteRequest | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const events = query.data?.pages.flatMap((page) => page.events) ?? [];
  const completedIndexes = useMemo(() => {
    let completedIndex = 0;
    const indexes = new Map<string, number>();

    events.forEach((event) => {
      if (event.type === 'completed') {
        indexes.set(event.id, completedIndex);
        completedIndex += 1;
      }
    });

    return indexes;
  }, [events]);

  const requestDelete = (event: JournalEvent) => {
    setOpenMenuId(null);
    setDeleteError(null);
    setRetryRequest(null);
    setDeleteRequest({
      event,
      finalEvent: summary.activityCount === 1 && !summary.titleState.activePlan,
    });
  };

  const executeDelete = async (
    request: DeleteRequest,
    emptyTitleAction = request.emptyTitleAction,
  ) => {
    try {
      const result = await deleteEvent.mutateAsync({
        emptyTitleAction,
        eventId: request.event.id,
        mediaType: media.mediaType,
      });
      setDeleteRequest(null);
      setRetryRequest(null);
      setDeleteError(null);
      if (result.titleDeleted) router.back();
    } catch (error) {
      setDeleteRequest(null);
      setRetryRequest({ ...request, emptyTitleAction });
      setDeleteError(
        error instanceof Error ? error.message : 'Try again in a moment.',
      );
    }
  };

  const completedCount = Math.max(summary.completedWatchCount, events.filter((event) => event.type === 'completed').length);

  return (
    <>
      <FlatList
        className="flex-1"
        contentContainerClassName="gap-3 px-5 pb-28 pt-5"
        data={events}
        keyExtractor={(event) => event.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.isLoading ? (
            <LoadingState message="Loading history" />
          ) : query.isError ? (
            <ErrorState
              message={
                query.error instanceof Error
                  ? query.error.message
                  : 'Unable to load your history.'
              }
              onRetry={() => query.refetch()}
              title="History unavailable"
            />
          ) : (
            <EmptyState
              actionLabel={media.mediaType === 'game' ? 'Log another play' : 'Log another watch'}
              message={`Record another dated ${media.mediaType === 'game' ? 'play' : 'watch'} to keep building this history.`}
              onAction={canRecordActivity ? () =>
                router.push({
                  pathname: '/modals/journal-entry',
                  params: {
                    intent: 'previous_watch',
                    mediaItemId: media.id,
                    source: 'history',
                  },
                }) : undefined}
              title="No history yet"
            />
          )
        }
        ListFooterComponent={
          <View className="gap-3">
            {query.isFetchNextPageError ? (
              <View className="gap-3">
                <Text className="text-sm text-reel-300">
                  {query.error instanceof Error
                    ? query.error.message
                    : 'Unable to load earlier activity.'}
                </Text>
                <Button
                  onPress={() => query.fetchNextPage()}
                  title="Try again"
                  variant="secondary"
                />
              </View>
            ) : null}
            {query.hasNextPage && !query.isFetchNextPageError ? (
              <Button
                loading={query.isFetchingNextPage}
                onPress={() => query.fetchNextPage()}
                title="Load earlier activity"
                variant="secondary"
              />
            ) : null}
          </View>
        }
        ListHeaderComponent={<HistoryHeader canRecordActivity={canRecordActivity} media={media} summary={summary} />}
        renderItem={({ item }) => (
          <JournalHistoryRow
            completedCount={completedCount}
            completedIndex={completedIndexes.get(item.id) ?? -1}
            event={item}
            isGame={media.mediaType === 'game'}
            allowEdit={canRecordActivity}
            menuOpen={openMenuId === item.id}
            onDelete={() => requestDelete(item)}
            onEdit={() => {
              setOpenMenuId(null);
              onEdit(item);
            }}
            onToggleMenu={() => setOpenMenuId((current) => (current === item.id ? null : item.id))}
            pending={deleteEvent.isPending}
          />
        )}
        showsVerticalScrollIndicator={false}
        testID="journal-history-list"
      />

      <JournalActionConfirmation
        body={
          deleteRequest?.finalEvent
            ? 'This is the final activity. Keep the title in Someday or remove the title and its Journal record.'
            : deleteRequest
              ? `Delete ${getJournalHistoryEventLabel(
                  deleteRequest.event,
                  completedIndexes.get(deleteRequest.event.id) ?? 0,
                  completedCount,
                ).toLowerCase()} from ${formatJournalHistoryDate(deleteRequest.event.eventDate)}? Other history and plans stay intact.`
              : ''
        }
        cancelLabel="Cancel"
        confirmLabel={deleteRequest?.finalEvent ? 'Remove title' : `Delete ${media.mediaType === 'game' ? 'play' : 'watch'}`}
        onCancel={() => setDeleteRequest(null)}
        onConfirm={() => {
          if (deleteRequest) {
            void executeDelete(deleteRequest, deleteRequest.finalEvent ? 'remove' : undefined);
          }
        }}
        onSecondary={
          deleteRequest?.finalEvent
            ? () => {
                void executeDelete(deleteRequest, 'keep_someday');
              }
            : undefined
        }
        pending={deleteEvent.isPending}
        secondaryLabel={deleteRequest?.finalEvent ? 'Keep in Someday' : undefined}
        title={deleteRequest?.finalEvent ? `Delete final ${media.mediaType === 'game' ? 'play' : 'watch'}?` : `Delete this ${media.mediaType === 'game' ? 'play' : 'watch'}?`}
        visible={deleteRequest !== null}
      />

      <JournalActionFeedback
        body={deleteError ?? 'Try again in a moment.'}
        onClose={() => {
          setDeleteError(null);
          setRetryRequest(null);
        }}
        onRetry={() => {
          if (retryRequest) void executeDelete(retryRequest);
        }}
        pending={deleteEvent.isPending}
        title={`Could not delete ${media.mediaType === 'game' ? 'play' : 'watch'}`}
        visible={deleteError !== null}
      />
    </>
  );
}
