import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { cn } from '@/lib/utils/cn';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverFeaturePresentationProps = {
  item: NormalizedMediaItem | null;
  loading: boolean;
  onPress?: (item: NormalizedMediaItem) => void;
};

function formatFeatureMetadata(item: NormalizedMediaItem) {
  return [item.year, ...item.genres.slice(0, 2)].filter(Boolean).join(' · ');
}

function DiscoverFeatureSkeleton() {
  return (
    <View
      accessibilityLabel="Loading featured title"
      accessibilityRole="progressbar"
      className="h-72 overflow-hidden rounded-2xl border border-archive-700 bg-archive-800 p-5">
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
export function DiscoverFeaturePresentation({
  item,
  loading,
  onPress,
}: DiscoverFeaturePresentationProps) {
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setBackdropFailed(false);
    setPosterFailed(false);
  }, [item?.mediaType, item?.source, item?.sourceId]);

  if (!item) {
    if (loading) {
      return <DiscoverFeatureSkeleton />;
    }

    return (
      <View className="h-72 justify-end rounded-2xl border border-archive-700 bg-archive-800 p-5">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-gold-300">
          Feature presentation
        </Text>
        <Text className="mt-2 text-xl font-bold text-archive-50">Nothing to feature yet</Text>
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
    <Pressable
      accessibilityLabel={`Open ${item.title}`}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      className="h-72 overflow-hidden rounded-2xl border border-gold-400/50 bg-archive-800 p-5"
      onPress={() => onPress?.(item)}>
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
          <Text className="font-serif text-3xl leading-9 text-archive-50" numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text className="text-xs leading-4 text-archive-200" numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          {metadata ? (
            <Text className="text-xs font-medium text-archive-100" numberOfLines={1}>
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
    </Pressable>
  );
}
