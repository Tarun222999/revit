import { router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { JournalActionDrawer } from '@/features/journal/components/JournalActionDrawer';
import { useOptionalAppCapabilities } from '@/features/capabilities/context/AppCapabilitiesProvider';
import type { JournalTimelineItem } from '@/features/journal/types';

function localDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthTitle(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    localDate(value),
  );
}

function dayParts(value: string) {
  const date = localDate(value);
  return {
    day: new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date),
  };
}

function eventLabel(item: JournalTimelineItem) {
  const game = item.media.mediaType === 'game';
  if (item.event.type === 'started') return game ? 'Started playing' : 'Started watching';
  if (item.event.type === 'stopped') return game ? 'Stopped playing' : 'Stopped watching';
  if (game) return 'Finished playing';
  if (item.isRewatch) return 'Rewatched';
  return item.media.mediaType === 'movie' ? 'Watched' : 'Finished';
}

function TimelineCard({ item, onPress }: { item: JournalTimelineItem; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="gap-3">
        <View className="flex-row gap-3">
          <MediaPoster imageUrl={item.media.imageUrl} size="sm" />
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-xs font-bold uppercase text-gold-300">
              {eventLabel(item)}
            </Text>
            <Text className="text-lg font-bold text-archive-50" numberOfLines={2}>
              {item.media.title}
            </Text>
            <Text className="text-xs capitalize text-archive-300">
              {[item.media.year, item.media.mediaType].filter(Boolean).join(' · ')}
            </Text>
            {item.event.rating != null ? (
              <Text className="font-bold text-gold-300">{item.event.rating} / 5</Text>
            ) : null}
            {item.event.playedOnPlatform ? (
              <Text className="text-xs text-archive-300">
                Played on · {item.event.playedOnPlatform}
              </Text>
            ) : null}
          </View>
        </View>
        {item.event.notes ? (
          <Text className="text-sm leading-5 text-archive-300" numberOfLines={4}>
            {item.event.notes}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

export function JournalTimelineView({
  empty,
  footer,
  hasNextPage,
  header,
  isFetchingNextPage,
  items,
  onItemPress,
  onLoadMore,
}: {
  empty?: ReactElement;
  footer?: ReactElement;
  hasNextPage: boolean;
  header: ReactElement;
  isFetchingNextPage: boolean;
  items: JournalTimelineItem[];
  onItemPress: (item: JournalTimelineItem) => void;
  onLoadMore: () => void;
}) {
  const { gamesEnabled } = useOptionalAppCapabilities();
  const [selectedItem, setSelectedItem] = useState<JournalTimelineItem | null>(null);

  const openEdit = (item: JournalTimelineItem) => {
    setSelectedItem(null);
    router.push({
      pathname: '/modals/journal-entry',
      params: {
        eventId: item.event.id,
        intent: 'edit_event',
        mediaItemId: item.media.id,
        source: 'history',
      },
    });
  };

  const openRewatch = (item: JournalTimelineItem) => {
    setSelectedItem(null);
    router.push({
      pathname: '/modals/journal-entry',
      params: { intent: 'rewatch', mediaItemId: item.media.id, source: 'title' },
    });
  };

  return (
    <>
      <FlatList
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pb-28 pt-5"
        data={items}
        keyExtractor={(item) => item.event.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={empty}
        ListFooterComponent={
          <View className="gap-3">
            {hasNextPage ? (
              <Button
                loading={isFetchingNextPage}
                onPress={onLoadMore}
                title="Load earlier activity"
                variant="secondary"
              />
            ) : null}
            {footer}
          </View>
        }
        ListHeaderComponent={header}
        renderItem={({ item, index }) => {
        const month = item.event.eventDate.slice(0, 7);
        const showMonth =
          index === 0 ||
          items[index - 1]?.event.eventDate.slice(0, 7) !== month;
        const parts = dayParts(item.event.eventDate);
        return (
          <View className="gap-3">
            {showMonth ? (
              <Text className="mt-2 text-sm font-bold uppercase text-gold-300">
                {monthTitle(item.event.eventDate)}
              </Text>
            ) : null}
            <View className="flex-row gap-3">
              <View className="w-12 items-center self-stretch">
                <View className="h-12 w-12 items-center justify-center rounded-full border border-gold-500 bg-archive-800">
                  <Text className="text-xs font-bold uppercase text-gold-300">{parts.month}</Text>
                  <Text className="font-bold text-archive-50">{parts.day}</Text>
                </View>
                {index < items.length - 1 ? (
                  <View className="mt-2 w-px flex-1 bg-archive-700" />
                ) : null}
              </View>
              <View className="min-w-0 flex-1 pb-2">
                <TimelineCard item={item} onPress={() => setSelectedItem(item)} />
              </View>
            </View>
          </View>
        );
        }}
        showsVerticalScrollIndicator={false}
        testID="journal-timeline-list"
      />
      <JournalActionDrawer
        actions={
          selectedItem
            ? [
                {
                  label: 'View title details',
                  onPress: () => {
                    const item = selectedItem;
                    setSelectedItem(null);
                    onItemPress(item);
                  },
                  tone: 'primary',
                },
                ...((selectedItem.media.mediaType !== 'game' || gamesEnabled)
                  ? [{ label: 'Edit activity', onPress: () => openEdit(selectedItem) }]
                  : []),
                ...(selectedItem.event.type === 'completed' &&
                (selectedItem.media.mediaType !== 'game' || gamesEnabled)
                  ? [{ label: selectedItem.media.mediaType === 'game' ? 'Play again' : 'Log a rewatch', onPress: () => openRewatch(selectedItem) }]
                  : []),
              ]
            : []
        }
        description={
          selectedItem
            ? `${eventLabel(selectedItem)} · ${selectedItem.event.eventDate}`
            : undefined
        }
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.media.title ?? ''}
        visible={selectedItem !== null}
      />
    </>
  );
}
