import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MEDIA_TYPE_LABELS, MEDIA_TYPES, type MediaType } from '@/constants/media';
import type { ListCoverMedia, UserListSummary } from '@/features/lists/types';
import { cn } from '@/lib/utils/cn';

type ListCardProps = {
  list: UserListSummary;
  onPress: () => void;
};

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
});

const coverAccentClasses: Record<MediaType, string> = {
  anime: 'bg-reel-500',
  game: 'bg-shelf-700',
  movie: 'bg-gold-500',
  series: 'bg-teal-500',
};

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateFormatter.format(date);
}

function getItemCountLabel(count: number) {
  return count === 1 ? '1 title' : `${count} titles`;
}

function getInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getMediaTypeCounts(coverItems: ListCoverMedia[]) {
  const counts = coverItems.reduce<Record<MediaType, number>>(
    (nextCounts, item) => ({
      ...nextCounts,
      [item.mediaType]: nextCounts[item.mediaType] + 1,
    }),
    {
      anime: 0,
      game: 0,
      movie: 0,
      series: 0,
    },
  );

  return MEDIA_TYPES.map((mediaType) => ({
    count: counts[mediaType],
    label: MEDIA_TYPE_LABELS[mediaType],
    mediaType,
  })).filter((item) => item.count > 0);
}

function CoverTile({
  className,
  item,
}: {
  className?: string;
  item?: ListCoverMedia;
}) {
  if (!item) {
    return (
      <View
        className={cn(
          'items-center justify-center rounded-md border border-dashed border-archive-500 bg-archive-700',
          className,
        )}>
        <Text className="text-xs font-bold text-archive-300">+</Text>
      </View>
    );
  }

  return (
    <View
      className={cn(
        'overflow-hidden rounded-md border border-archive-700',
        coverAccentClasses[item.mediaType],
        className,
      )}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          contentFit="cover"
          style={{ height: '100%', width: '100%' }}
        />
      ) : (
        <View className="h-full w-full items-center justify-center px-1">
          <Text
            adjustsFontSizeToFit
            className="text-center text-xs font-black text-archive-50"
            numberOfLines={1}>
            {getInitials(item.title) || MEDIA_TYPE_LABELS[item.mediaType][0]}
          </Text>
        </View>
      )}
    </View>
  );
}

function ListCoverCollage({ coverItems }: { coverItems: ListCoverMedia[] }) {
  const tiles = Array.from({ length: 4 }, (_, index) => coverItems[index]);

  return (
    <View className="h-24 w-24 flex-row gap-1">
      <CoverTile className="h-full flex-1" item={tiles[0]} />
      <View className="flex-1 gap-1">
        <CoverTile className="flex-1" item={tiles[1]} />
        <CoverTile className="flex-1" item={tiles[2]} />
      </View>
    </View>
  );
}

export function ListCard({ list, onPress }: ListCardProps) {
  const mediaTypeCounts = getMediaTypeCounts(list.coverItems);
  const updatedAt = formatUpdatedAt(list.updatedAt);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="gap-3 p-3">
        <View className="flex-row gap-3">
          <ListCoverCollage coverItems={list.coverItems} />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <Text className="text-lg font-bold text-archive-50" numberOfLines={2}>
                {list.name}
              </Text>
              {list.description ? (
                <Text className="text-sm leading-5 text-archive-300" numberOfLines={2}>
                  {list.description}
                </Text>
              ) : (
                <Text className="text-sm leading-5 text-archive-300" numberOfLines={2}>
                  Mixed-media collection
                </Text>
              )}
            </View>

            <View className="flex-row flex-wrap gap-2">
              <View className="rounded-full bg-archive-700 px-3 py-1">
                <Text className="text-xs font-bold text-gold-300">
                  {getItemCountLabel(list.itemCount)}
                </Text>
              </View>
              {list.isDefault ? (
                <View className="rounded-full bg-shelf-700 px-3 py-1">
                  <Text className="text-xs font-bold text-archive-100">Default</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between gap-3 border-t border-archive-700 pt-3">
          <View className="min-w-0 flex-1 flex-row flex-wrap gap-2">
            {mediaTypeCounts.length > 0 ? (
              mediaTypeCounts.map((item) => (
                <View
                  className="rounded-full bg-archive-700 px-2 py-1"
                  key={item.mediaType}>
                  <Text className="text-xs font-semibold text-archive-200">
                    {item.count} {item.label}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-xs font-semibold text-archive-300">
                Ready for titles
              </Text>
            )}
          </View>

          {updatedAt ? (
            <Text className="text-xs font-semibold text-archive-300">
              Updated {updatedAt}
            </Text>
          ) : null}
        </View>

      </Card>
    </Pressable>
  );
}
