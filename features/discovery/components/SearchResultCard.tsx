import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { Card } from '@/components/ui/Card';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { NormalizedMediaItem } from '@/types/media';

type SearchResultCardProps = {
  item: NormalizedMediaItem;
  onPress: () => void;
};

function formatMetadata(item: NormalizedMediaItem) {
  const parts = [MEDIA_TYPE_LABELS[item.mediaType]];

  if (item.year) {
    parts.push(item.year);
  }

  if (item.genres.length > 0) {
    parts.push(item.genres.slice(0, 2).join(', '));
  }

  return parts.join(' - ');
}

function SearchResultCardComponent({ item, onPress }: SearchResultCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="p-3">
        <View className="flex-row gap-3">
          <MediaPoster imageUrl={item.imageUrl} size="sm" />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <View className="flex-row items-start justify-between gap-3">
                <Text
                  className="min-w-0 flex-1 text-base font-semibold text-archive-50"
                  numberOfLines={2}>
                  {item.title}
                </Text>
                <View className="rounded-full bg-archive-700 px-2 py-1">
                  <Text className="text-[11px] font-semibold uppercase text-gold-300">
                    {MEDIA_TYPE_LABELS[item.mediaType]}
                  </Text>
                </View>
              </View>

              <Text className="text-sm text-archive-300" numberOfLines={1}>
                {formatMetadata(item)}
              </Text>
            </View>

            {item.description ? (
              <Text className="text-sm leading-5 text-archive-200" numberOfLines={3}>
                {item.description}
              </Text>
            ) : (
              <Text className="text-sm leading-5 text-archive-300" numberOfLines={2}>
                Details will load when this title opens.
              </Text>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export const SearchResultCard = memo(SearchResultCardComponent);
