import { Alert, Text, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDeleteJournalEvent } from '@/features/journal/hooks/useJournalLifecycleMutations';
import { useJournalHistory } from '@/features/journal/hooks/useJournalReads';
import type { JournalEvent, JournalTitleSummary } from '@/features/journal/types';

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function eventLabel(event: JournalEvent, completedIndex: number, completedCount: number) {
  if (event.type === 'started') return 'Started watching';
  if (event.type === 'stopped') return 'Stopped watching';
  return completedIndex < completedCount - 1 ? 'Rewatched' : 'Watched';
}

export function JournalHistoryPanel({
  onEdit,
  summary,
  userId,
}: {
  onEdit: (event: JournalEvent) => void;
  summary: JournalTitleSummary;
  userId: string;
}) {
  const query = useJournalHistory(userId, summary.titleState.id);
  const deleteEvent = useDeleteJournalEvent();
  const events = query.data?.pages.flatMap((page) => page.events) ?? [];
  let completedIndex = 0;

  const remove = (event: JournalEvent, emptyTitleAction?: 'keep_someday' | 'remove') => {
    void deleteEvent.mutateAsync({ eventId: event.id, emptyTitleAction }).catch((error) => {
      Alert.alert(
        'Could not delete activity',
        error instanceof Error ? error.message : 'Try again in a moment.',
      );
    });
  };

  const confirmDelete = (event: JournalEvent) => {
    if (summary.activityCount === 1 && !summary.titleState.activePlan) {
      Alert.alert(
        'Delete final activity?',
        'Choose whether this title stays in Someday or is removed from your Journal.',
        [
          { style: 'cancel', text: 'Cancel' },
          { text: 'Keep in Someday', onPress: () => remove(event, 'keep_someday') },
          { style: 'destructive', text: 'Remove title', onPress: () => remove(event, 'remove') },
        ],
      );
      return;
    }

    Alert.alert(
      'Delete this activity?',
      `Delete ${eventLabel(event, 0, summary.completedWatchCount).toLowerCase()} from ${formatDate(event.eventDate)}? Other history and plans stay intact.`,
      [
        { style: 'cancel', text: 'Cancel' },
        { style: 'destructive', text: 'Delete activity', onPress: () => remove(event) },
      ],
    );
  };

  return (
    <Card className="gap-4">
      <View className="gap-1">
        <Text className="text-lg font-bold text-archive-50">History</Text>
        <Text className="text-sm text-archive-300">
          Every activity is separate. Editing one will not overwrite another.
        </Text>
      </View>

      {query.isLoading ? <LoadingState message="Loading history" /> : null}
      {query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : 'Unable to load history.'}
          onRetry={() => query.refetch()}
          title="History unavailable"
        />
      ) : null}
      {query.isSuccess && events.length === 0 ? (
        <Text className="text-sm text-archive-300">No dated activity yet.</Text>
      ) : null}

      {events.map((event) => {
        const currentCompletedIndex = event.type === 'completed' ? completedIndex++ : -1;
        return (
          <View className="gap-3 border-t border-archive-700 pt-4" key={event.id}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-bold text-archive-50">
                  {eventLabel(event, currentCompletedIndex, summary.completedWatchCount)}
                </Text>
                <Text className="text-sm text-archive-300">{formatDate(event.eventDate)}</Text>
              </View>
              {event.rating != null ? (
                <Text className="font-bold text-gold-300">{event.rating} / 5</Text>
              ) : null}
            </View>
            {event.notes ? (
              <Text className="text-sm leading-5 text-archive-300">{event.notes}</Text>
            ) : null}
            <View className="flex-row gap-2">
              <Button
                className="min-w-0 flex-1"
                disabled={deleteEvent.isPending}
                onPress={() => onEdit(event)}
                title="Edit activity"
                variant="secondary"
              />
              <Button
                className="min-w-0 flex-1"
                disabled={deleteEvent.isPending}
                onPress={() => confirmDelete(event)}
                title="Delete activity"
                variant="ghost"
              />
            </View>
          </View>
        );
      })}

      {query.hasNextPage ? (
        <Button
          loading={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}
          title="Load earlier activity"
          variant="secondary"
        />
      ) : null}
    </Card>
  );
}
