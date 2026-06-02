import { Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import { formatTitleMetadataLine } from '@/features/media/model/titleDetails';
import type { NormalizedMediaItem } from '@/types/media';

type TitleDetailsHeroProps = {
  item: NormalizedMediaItem;
};

export function TitleDetailsHero({ item }: TitleDetailsHeroProps) {
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
        </View>
      </View>
    </View>
  );
}
