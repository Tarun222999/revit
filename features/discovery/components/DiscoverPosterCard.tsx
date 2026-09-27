import { memo, useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Pressable, Text, View, type PressableProps } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { cn } from '@/lib/utils/cn';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverPosterCardProps = PressableProps & {
  focused?: boolean;
  motionEnabled?: boolean;
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
  focused = true,
  motionEnabled = false,
  item,
  onPress,
  variant = 'rail',
  ...props
}: DiscoverPosterCardProps) {
  const isListing = variant === 'listing';
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = motionEnabled
      ? withTiming(focused ? 1 : 0, {
          duration: 340,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          reduceMotion: ReduceMotion.System,
        })
      : focused
        ? 1
        : 0;
    return () => cancelAnimation(progress);
  }, [focused, motionEnabled, progress]);
  const focusStyle = useAnimatedStyle(() =>
    isListing
      ? {}
      : {
          opacity: interpolate(progress.value, [0, 1], [0.76, 1]),
          transform: motionEnabled
            ? [
                { scale: interpolate(progress.value, [0, 1], [0.96, 1.035]) },
                { translateY: interpolate(progress.value, [0, 1], [5, -3]) },
              ]
            : [],
        },
  );
  const metadata = formatMetadata(item);

  return (
    <Pressable
      accessibilityLabel={`Open ${item.title}`}
      accessibilityRole="button"
      className={cn(
        isListing
          ? 'min-w-0 rounded-app border border-archive-700 bg-archive-800 p-2'
          : 'w-32 py-3',
        className,
      )}
      onPress={onPress}
      {...props}>
      <Animated.View className="gap-2" style={focusStyle}>
        <MediaPoster
          imageUrl={item.imageUrl}
          size={isListing ? 'lg' : 'md'}
          className={
            isListing
              ? 'h-56 w-full'
              : focused
                ? 'h-44 w-32 border-gold-300'
                : 'h-44 w-32'
          }
        />

        <View className="gap-1">
          {isListing ? (
            <View className="self-start rounded border border-teal-500 bg-shelf-700 px-1.5 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-gold-300">
                {MEDIA_TYPE_LABELS[item.mediaType]}
              </Text>
            </View>
          ) : null}

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
      </Animated.View>
    </Pressable>
  );
}

export const DiscoverPosterCard = memo(DiscoverPosterCardComponent);
