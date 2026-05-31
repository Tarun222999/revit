import { memo } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { cn } from '@/lib/utils/cn';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverPosterCardProps = PressableProps & {
  item: NormalizedMediaItem;
  onPress: () => void;
  variant?: 'rail' | 'listing';
};

function formatMetadata(item: NormalizedMediaItem) {
  const parts = [];

  if (item.year) {
    parts.push(item.year);
  }

  if (item.genres.length > 0) {
    parts.push(item.genres.slice(0, 2).join(', '));
  }

  return parts.join(' - ');
}

function DiscoverPosterCardComponent({
  className,
  item,
  onPress,
  variant = 'rail',
  ...props
}: DiscoverPosterCardProps) {
  const isListing = variant === 'listing';
  const metadata = formatMetadata(item);

  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        isListing
          ? 'min-w-0 rounded-app border border-archive-700 bg-archive-800 p-2'
          : 'w-28',
        className,
      )}
      onPress={onPress}
      {...props}>
      <View className="gap-2">
        <MediaPoster
          imageUrl={item.imageUrl}
          size={isListing ? 'lg' : 'md'}
          className={isListing ? 'h-56 w-full' : 'w-28'}
        />

        <View className="gap-1">
          <View
            className={cn(
              'self-start rounded border px-1.5 py-0.5',
              isListing
                ? 'border-teal-500 bg-shelf-700'
                : 'border-gold-400',
            )}>
            <Text className="text-[10px] font-bold uppercase text-gold-300">
              {MEDIA_TYPE_LABELS[item.mediaType]}
            </Text>
          </View>

          <Text
            className="text-sm font-semibold leading-5 text-archive-50"
            numberOfLines={2}>
            {item.title}
          </Text>

          {metadata ? (
            <Text
              className="text-xs leading-4 text-archive-300"
              numberOfLines={isListing ? 2 : 1}>
              {metadata}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const DiscoverPosterCard = memo(DiscoverPosterCardComponent);
