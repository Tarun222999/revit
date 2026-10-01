import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { mediaItemKey } from '@/features/discovery/utils/dedupeMediaItems';
import { Image } from 'expo-image';

import { cn } from '@/lib/utils/cn';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverFeaturePresentationProps = {
  item: NormalizedMediaItem | null;
  loading: boolean;
  onPress?: (item: NormalizedMediaItem) => void;
  motionEnabled?: boolean;
  gamesEnabled?: boolean;
  onInteractionChange?: (interacting: boolean) => void;
  onSettle?: (item: NormalizedMediaItem) => void;
};

function formatFeatureMetadata(item: NormalizedMediaItem) {
  return [item.year, ...item.genres.slice(0, 2)].filter(Boolean).join(' · ');
}

function DiscoverFeatureSkeleton({ height }: { height: number }) {
  return (
    <View
      accessibilityLabel="Loading featured title"
      accessibilityRole="progressbar"
      style={{ height }}
      className="overflow-hidden rounded-2xl border border-archive-700 bg-archive-800 p-5">
      <View className="absolute inset-0 bg-shelf-700" />
      <View className="mt-auto flex-row items-end gap-4">
        <View className="h-40 w-28 rounded-app bg-archive-700" />
        <View className="flex-1 gap-3 pb-1">
          <View className="h-3 w-24 rounded-full bg-archive-700" />
          <View className="h-7 w-full rounded-full bg-archive-700" />
          <View className="h-3 w-5/6 rounded-full bg-archive-700" />
          <View className="h-3 w-2/3 rounded-full bg-archive-700" />
        </View>
      </View>
    </View>
  );
}

/**
 * Renders the fixed-size Discover focal title using already-loaded rail data.
 * The previous completed title stays mounted while a new mode resolves.
 */
function FeatureArtwork({
  item,
  loading,
}: Pick<DiscoverFeaturePresentationProps, 'item' | 'loading'>) {
  const { fontScale } = useWindowDimensions();
  const height = 288 + Math.max(0, fontScale - 1) * 160;
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setBackdropFailed(false);
    setPosterFailed(false);
  }, [item?.imageUrl, item?.backdropUrl]);

  if (!item) {
    if (loading) {
      return <DiscoverFeatureSkeleton height={height} />;
    }

    return (
      <View
        style={{ height }}
        className="justify-end rounded-2xl border border-archive-700 bg-archive-800 p-5">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-gold-300">
          Feature presentation
        </Text>
        <Text className="mt-2 text-xl font-bold text-archive-50">
          Nothing to feature yet
        </Text>
        <Text className="mt-2 text-sm leading-5 text-archive-300">
          Try another discovery mode while these shelves refresh.
        </Text>
      </View>
    );
  }

  const metadata = formatFeatureMetadata(item);
  const hasBackdrop = Boolean(item.backdropUrl) && !backdropFailed;
  const hasPoster = Boolean(item.imageUrl) && !posterFailed;

  return (
    <View
      style={{ height }}
      className="overflow-hidden rounded-2xl border border-gold-400/50 bg-archive-800 p-5">
      {hasBackdrop ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => setBackdropFailed(true)}
          source={{ uri: item.backdropUrl! }}
          style={StyleSheet.absoluteFillObject}
          testID="discover-feature-backdrop"
          transition={0}
        />
      ) : (
        <View className="absolute inset-0 bg-shelf-700" />
      )}
      <View className="absolute inset-0 bg-archive-900/70" />
      <View className="absolute bottom-0 left-0 top-0 w-3/4 bg-archive-900/30" />

      <View className="mt-auto flex-row items-end gap-4">
        <View className="h-40 w-28 overflow-hidden rounded-app border border-archive-500 bg-shelf-700 shadow-lg">
          {hasPoster ? (
            <Image
              cachePolicy="memory-disk"
              contentFit="cover"
              onError={() => setPosterFailed(true)}
              source={{ uri: item.imageUrl! }}
              style={StyleSheet.absoluteFillObject}
              testID="discover-feature-poster"
              transition={0}
            />
          ) : (
            <View className="h-full w-full bg-shelf-700" />
          )}
        </View>

        <View className="flex-1 gap-2 pb-1">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-gold-300">
            Feature presentation
          </Text>
          <Text
            className="font-serif text-3xl leading-9 text-archive-50"
            numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text
              className="text-xs leading-4 text-archive-200"
              numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          {metadata ? (
            <Text
              className="text-xs font-medium text-archive-100"
              numberOfLines={1}>
              {metadata}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        className={cn(
          'absolute inset-0 border border-gold-400/20',
          loading && 'border-gold-300/50',
        )}
        pointerEvents="none"
      />
    </View>
  );
}

/** Artwork layers are decorative; a single control owns navigation identity. */
export function DiscoverFeaturePresentation({
  item,
  loading,
  onPress,
  motionEnabled = false,
  gamesEnabled = true,
  onInteractionChange,
  onSettle,
}: DiscoverFeaturePresentationProps) {
  const [layers, setLayers] = useState({
    current: item,
    previous: null as NormalizedMediaItem | null,
  });
  const opacity = useSharedValue(0);
  const generation = useRef(0);
  const interaction = useRef(new Set<string>());
  const key = item ? mediaItemKey(item) : null;
  const currentKey = layers.current ? mediaItemKey(layers.current) : null;
  useLayoutEffect(() => {
    cancelAnimation(opacity);
    generation.current += 1;
    setLayers((current) => ({
      current: item,
      previous:
        item &&
        motionEnabled &&
        (gamesEnabled || current.current?.mediaType !== 'game') &&
        key !== (current.current ? mediaItemKey(current.current) : null)
          ? current.current
          : null,
    }));
    opacity.value = 1;
  }, [item, key, motionEnabled, gamesEnabled, opacity]);
  const complete = useCallback((version: number) => {
    if (version === generation.current)
      setLayers((current) => ({ ...current, previous: null }));
  }, []);
  useEffect(() => {
    if (!layers.previous || !motionEnabled) {
      cancelAnimation(opacity);
      opacity.value = 0;
      if (layers.previous)
        setLayers((current) => ({ ...current, previous: null }));
      return;
    }
    const version = generation.current;
    opacity.value = withTiming(
      0,
      {
        duration: 700,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.Never,
      },
      (finished) => {
        if (finished) runOnJS(complete)(version);
      },
    );
    return () => cancelAnimation(opacity);
  }, [layers.previous, motionEnabled, opacity, complete]);
  const outgoingStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const setInteraction = (reason: string, active: boolean) => {
    if (active) interaction.current.add(reason);
    else interaction.current.delete(reason);
    onInteractionChange?.(interaction.current.size > 0);
  };
  useEffect(() => {
    if (!layers.current && interaction.current.size > 0) {
      interaction.current.clear();
      onInteractionChange?.(false);
    }
  }, [layers.current, onInteractionChange]);
  useEffect(
    () => () => {
      if (interaction.current.size > 0) onInteractionChange?.(false);
      interaction.current.clear();
    },
    [onInteractionChange],
  );
  useEffect(
    () => () => {
      generation.current += 1;
      cancelAnimation(opacity);
    },
    [opacity],
  );
  if (!layers.current) return <FeatureArtwork item={null} loading={loading} />;
  const settleVisibleTitle = () => {
    // A tap during a dissolve settles the dominant visual layer before opening it.
    const target =
      layers.previous && opacity.value > 0.5 ? layers.previous : layers.current;
    if (!target) return;
    generation.current += 1;
    cancelAnimation(opacity);
    opacity.value = 0;
    setLayers({ current: target, previous: null });
    if (mediaItemKey(target) !== currentKey) onSettle?.(target);
    return target;
  };
  const openVisibleTitle = () => {
    const target = settleVisibleTitle();
    if (target) onPress?.(target);
  };
  return (
    <Pressable
      accessibilityLabel={'Open ' + layers.current.title}
      accessibilityRole="button"
      accessibilityHint="Opens title details"
      onPress={openVisibleTitle}
      onPressIn={() => {
        settleVisibleTitle();
        setInteraction('press', true);
      }}
      onPressOut={() => setInteraction('press', false)}
      onFocus={() => {
        settleVisibleTitle();
        setInteraction('focus', true);
      }}
      onBlur={() => setInteraction('focus', false)}
      onHoverIn={() => {
        settleVisibleTitle();
        setInteraction('hover', true);
      }}
      onHoverOut={() => setInteraction('hover', false)}>
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <FeatureArtwork
          key={currentKey ?? 'empty'}
          item={layers.current}
          loading={loading}
        />
        {layers.previous ? (
          <Animated.View style={[StyleSheet.absoluteFillObject, outgoingStyle]}>
            <FeatureArtwork
              key={mediaItemKey(layers.previous)}
              item={layers.previous}
              loading={false}
            />
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  );
}
