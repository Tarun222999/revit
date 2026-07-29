import { Pressable, Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
  if (item.event.type === 'started') return 'Started watching';
  if (item.event.type === 'stopped') return 'Stopped watching';
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
  hasNextPage,
  isFetchingNextPage,
  items,
  onItemPress,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  items: JournalTimelineItem[];
  onItemPress: (item: JournalTimelineItem) => void;
  onLoadMore: () => void;
}) {
  let previousMonth = '';

  return (
    <View className="gap-4">
      {items.map((item, index) => {
        const month = item.event.eventDate.slice(0, 7);
        const showMonth = month !== previousMonth;
        previousMonth = month;
        const parts = dayParts(item.event.eventDate);
        return (
          <View className="gap-3" key={item.event.id}>
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
                <TimelineCard item={item} onPress={() => onItemPress(item)} />
              </View>
            </View>
          </View>
        );
      })}

      {hasNextPage ? (
        <Button
          loading={isFetchingNextPage}
          onPress={onLoadMore}
          title="Load earlier activity"
          variant="secondary"
        />
      ) : null}
    </View>
  );
}
