import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { MediaPoster } from '@/components/media/MediaPoster';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import {
  formatTitleHeroMetadata,
  formatTmdbRating,
} from '@/features/media/model/titleDetails';
import type { NormalizedMediaItem } from '@/types/media';

type TitleDetailsHeroProps = {
  item: NormalizedMediaItem;
};

export function TitleDetailsHero({ item }: TitleDetailsHeroProps) {
  const [backdropFailed, setBackdropFailed] = useState(false);
  const metadata = formatTitleHeroMetadata(item);
  const rating = formatTmdbRating(item);

  useEffect(() => {
    setBackdropFailed(false);
  }, [item.backdropUrl]);

  return (
    <View className="relative min-h-[448px] overflow-hidden bg-archive-800 px-5 pb-8 pt-28">
      {item.backdropUrl && !backdropFailed ? (
        <Image
          contentFit="cover"
          onError={() => setBackdropFailed(true)}
          source={{ uri: item.backdropUrl }}
          style={StyleSheet.absoluteFillObject}
          testID="title-backdrop-image"
        />
      ) : (
        <View
          className="bg-shelf-700"
          style={StyleSheet.absoluteFillObject}
          testID="title-backdrop-fallback"
        />
      )}
      <View className="absolute inset-0 bg-archive-900/45" />

      <View className="relative mt-auto flex-row items-end gap-4">
        <MediaPoster
          className="h-48 w-32 rounded-lg border-archive-300 shadow-2xl"
          imageUrl={item.imageUrl}
        />

        <View className="min-w-0 flex-1 gap-1 pb-1">
          <Text className="text-xs font-bold uppercase tracking-widest text-gold-300">
            {MEDIA_TYPE_LABELS[item.mediaType]}
          </Text>
          <Text className="font-serif text-3xl font-semibold leading-9 text-archive-50">
            {item.title}
          </Text>
          {item.originalTitle && item.originalTitle !== item.title ? (
            <Text className="text-sm leading-5 text-archive-200">
              {item.originalTitle}
            </Text>
          ) : null}
          {metadata ? (
            <Text className="text-sm leading-5 text-archive-100">{metadata}</Text>
          ) : null}
          {rating ? (
            <View className="flex-row items-center gap-1">
              <Ionicons color="#e8c77d" name="star" size={13} />
              <Text className="text-xs font-bold text-gold-300">{rating}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
