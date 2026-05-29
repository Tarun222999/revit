import { Pressable, Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverPosterCardProps = {
  item: NormalizedMediaItem;
  onPress: () => void;
};

export function DiscoverPosterCard({ item, onPress }: DiscoverPosterCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="w-28"
      onPress={onPress}>
      <View className="gap-2">
        <MediaPoster imageUrl={item.imageUrl} size="md" className="w-28" />

        <View className="gap-1">
          <View className="self-start rounded border border-gold-400 px-1.5 py-0.5">
            <Text className="text-[10px] font-bold uppercase text-gold-300">
              {MEDIA_TYPE_LABELS[item.mediaType]}
            </Text>
          </View>

          <Text
            className="text-sm font-semibold leading-5 text-archive-50"
            numberOfLines={2}>
            {item.title}
          </Text>

          {item.year ? (
            <Text className="text-xs text-archive-300" numberOfLines={1}>
              {item.year}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
