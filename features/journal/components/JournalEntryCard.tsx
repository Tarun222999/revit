import { Pressable, Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { RatingBadge } from '@/components/media/RatingBadge';
import { StatusBadge } from '@/components/media/StatusBadge';
import { Card } from '@/components/ui/Card';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { JournalListEntry, JournalSort } from '@/features/journal/types';

type JournalEntryCardProps = {
  entry: JournalListEntry;
  sort: JournalSort;
  onPress: () => void;
};

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
});

function formatDate(date: string) {
  return dateFormatter.format(new Date(date));
}

function getActivityLabel(entry: JournalListEntry, sort: JournalSort) {
  if (entry.status === 'planned' && entry.startedOn) {
    return `Planned for ${formatDate(entry.startedOn)}`;
  }

  if (sort === 'recently_added') {
    return `Added ${formatDate(entry.createdAt)}`;
  }

  return `Updated ${formatDate(entry.lastActivityAt)}`;
}

function getMetadata(entry: JournalListEntry) {
  const parts = [MEDIA_TYPE_LABELS[entry.mediaType]];

  if (entry.year) {
    parts.push(entry.year);
  }

  return parts.join(' - ');
}

function getReviewPreview(entry: JournalListEntry) {
  if (entry.containsSpoilers && (entry.reviewHeadline || entry.reviewBody)) {
    return 'Review contains spoilers.';
  }

  return entry.reviewHeadline || entry.reviewBody;
}

export function JournalEntryCard({ entry, sort, onPress }: JournalEntryCardProps) {
  const reviewPreview = getReviewPreview(entry);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="p-3">
        <View className="flex-row gap-3">
          <MediaPoster imageUrl={entry.imageUrl} size="sm" />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <View className="flex-row items-start justify-between gap-3">
                <Text
                  className="min-w-0 flex-1 text-base font-bold text-archive-50"
                  numberOfLines={2}>
                  {entry.title}
                </Text>
                <RatingBadge rating={entry.rating} />
              </View>

              <Text className="text-sm text-archive-300" numberOfLines={1}>
                {getMetadata(entry)}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <View className="rounded-full bg-archive-700 px-3 py-1">
                <Text className="text-xs font-bold text-gold-300">
                  {MEDIA_TYPE_LABELS[entry.mediaType]}
                </Text>
              </View>
              <StatusBadge status={entry.status} />
            </View>

            {reviewPreview ? (
              <Text className="text-sm leading-5 text-archive-200" numberOfLines={2}>
                {reviewPreview}
              </Text>
            ) : null}

            <Text className="text-xs font-semibold text-archive-300">
              {getActivityLabel(entry, sort)}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
