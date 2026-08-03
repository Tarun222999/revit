import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import { formatTitleMetadataLine } from '@/features/media/model/titleDetails';
import type { NormalizedMediaItem } from '@/types/media';

type TitleDetailsHeroProps = {
  item: NormalizedMediaItem;
  onWatchTrailer?: () => void;
  showTrailer?: boolean;
};

export function TitleDetailsHero({
  item,
  onWatchTrailer,
  showTrailer = false,
}: TitleDetailsHeroProps) {
  return (
    <View className="flex-row gap-4">
      <MediaPoster imageUrl={item.imageUrl} size="lg" />

      <View className="min-w-0 flex-1 justify-end gap-3">
        <View className="self-start rounded-full bg-gold-400 px-3 py-1">
          <Text className="text-xs font-bold uppercase text-archive-900">
            {MEDIA_TYPE_LABELS[item.mediaType]}
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-3xl font-bold leading-9 text-archive-50">
            {item.title}
          </Text>
          {item.originalTitle && item.originalTitle !== item.title ? (
            <Text className="text-sm leading-5 text-archive-300">
              {item.originalTitle}
            </Text>
          ) : null}
          <Text className="text-sm leading-5 text-archive-300">
            {formatTitleMetadataLine(item)}
          </Text>
          {showTrailer ? (
            <Pressable
              accessibilityHint="Opens the trailer in YouTube."
              accessibilityLabel={`Watch trailer for ${item.title}`}
              accessibilityRole="button"
              className="min-h-11 self-start flex-row items-center justify-center gap-1.5 rounded-full border border-archive-500 bg-archive-800 px-3 py-2"
              onPress={onWatchTrailer}>
              <Ionicons color="#f0c15a" name="play" size={14} />
              <Text className="text-sm font-semibold text-gold-300">Trailer</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
