import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, type ViewToken } from 'react-native';
import { router } from 'expo-router';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { DiscoverPosterCard } from '@/features/discovery/components/DiscoverPosterCard';
import { useDiscoverRail } from '@/features/discovery/hooks/useDiscoverRail';
import {
  dedupeMediaItems,
  mediaItemKey,
} from '@/features/discovery/utils/dedupeMediaItems';
import { createMediaRouteId } from '@/features/media/api/media-api';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverRailProps = {
  title: string;
  mode: DiscoveryMode;
  mediaType: DiscoveryMediaType;
  onSeeAll?: (mode: DiscoveryMode, mediaType: DiscoveryMediaType) => void;
  queryEnabled?: boolean;
  motionEnabled?: boolean;
  onInteractionChange?: (mediaType: DiscoveryMediaType, active: boolean) => void;
};

const RAIL_RESULT_LIMIT = 10;
const RAIL_INITIAL_RENDER_COUNT = 5;
const RAIL_MAX_RENDER_BATCH = 5;
const RAIL_UPDATE_BATCH_MS = 80;
const RAIL_WINDOW_SIZE = 5;

function getRailErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Discovery data is unavailable right now.';
}

function openRailTitleDetails(item: NormalizedMediaItem) {
  router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`);
}

function RailSeparator() {
  return <View className="w-3" />;
}

function DiscoverRailSkeleton() {
  return (
    <View
      accessibilityLabel="Loading discovery titles"
      accessibilityRole="progressbar"
      className="flex-row gap-3">
      {[0, 1, 2, 3].map((index) => (
        <View className="w-32 gap-2 py-3" key={index}>
          <View className="h-44 rounded-app bg-archive-800" />
          <View className="h-3 rounded-full bg-archive-800" />
          <View className="h-2 w-2/3 rounded-full bg-archive-800" />
        </View>
      ))}
    </View>
  );
}

/**
 * Renders one horizontal discovery shelf for a mode/media pair.
 *
 * @param title - Section title shown above the shelf.
 * @param mode - Discovery mode used by the rail query.
 * @param mediaType - Media category used by the rail query.
 * @param onSeeAll - Optional navigation handler for full listing pages.
 * @returns A loading, error, empty, or horizontal poster rail state.
 */
export function DiscoverRail({
  title,
  mode,
  mediaType,
  onSeeAll,
  queryEnabled = true,
  motionEnabled = false,
  onInteractionChange,
}: DiscoverRailProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const interactions = useRef(new Set<string>());
  const setInteraction = useCallback(
    (reason: string, active: boolean) => {
      const wasActive = interactions.current.size > 0;
      if (active) interactions.current.add(reason);
      else interactions.current.delete(reason);
      const isActive = interactions.current.size > 0;
      if (wasActive !== isActive) onInteractionChange?.(mediaType, isActive);
    },
    [mediaType, onInteractionChange],
  );
  const clearInteractions = useCallback(() => {
    if (interactions.current.size === 0) return;
    interactions.current.clear();
    onInteractionChange?.(mediaType, false);
  }, [mediaType, onInteractionChange]);
  useEffect(() => () => clearInteractions(), [clearInteractions]);
  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken<NormalizedMediaItem>[];
    }) => {
      const visible = viewableItems.filter((token) => token.isViewable);
      if (visible.length)
        setFocusedKey(
          mediaItemKey(visible[Math.floor((visible.length - 1) / 2)].item),
        );
    },
  ).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 100,
  }).current;
  const railQuery = useDiscoverRail(mode, mediaType, 1, queryEnabled);
  const results = useMemo(
    () =>
      dedupeMediaItems(railQuery.data?.results ?? []).slice(
        0,
        RAIL_RESULT_LIMIT,
      ),
    [railQuery.data?.results],
  );
  useEffect(() => {
    if (results.length === 0) {
      clearInteractions();
      return;
    }
    const validKeys = new Set(results.map(mediaItemKey));
    const wasActive = interactions.current.size > 0;
    for (const reason of interactions.current) {
      const separator = reason.indexOf(':');
      if (separator !== -1 && !validKeys.has(reason.slice(separator + 1)))
        interactions.current.delete(reason);
    }
    if (wasActive && interactions.current.size === 0)
      onInteractionChange?.(mediaType, false);
  }, [results, clearInteractions, mediaType, onInteractionChange]);
  const keyExtractor = useCallback(
    (item: NormalizedMediaItem) => mediaItemKey(item),
    [],
  );
  const selectedKey = results.some((item) => mediaItemKey(item) === focusedKey)
    ? focusedKey
    : results[0]
      ? mediaItemKey(results[0])
      : null;
  const renderItem = useCallback(
    ({ item }: { item: NormalizedMediaItem }) => (
      <DiscoverPosterCard
        focused={mediaItemKey(item) === selectedKey}
        motionEnabled={motionEnabled}
        onFocus={() => {
          setFocusedKey(mediaItemKey(item));
          setInteraction(`focus:${mediaItemKey(item)}`, true);
        }}
        onBlur={() => setInteraction(`focus:${mediaItemKey(item)}`, false)}
        onPressIn={() => setInteraction(`press:${mediaItemKey(item)}`, true)}
        onPressOut={() => setInteraction(`press:${mediaItemKey(item)}`, false)}
        onHoverIn={() => {
          setFocusedKey(mediaItemKey(item));
          setInteraction(`hover:${mediaItemKey(item)}`, true);
        }}
        onHoverOut={() => setInteraction(`hover:${mediaItemKey(item)}`, false)}
        item={item}
        onPress={() => openRailTitleDetails(item)}
      />
    ),
    [selectedKey, motionEnabled, setInteraction],
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-2xl font-bold text-archive-50">{title}</Text>

        {onSeeAll ? (
          <Pressable
            accessibilityLabel={`See all ${title}`}
            accessibilityRole="button"
            className="min-h-11 justify-center px-2"
            onPress={() => onSeeAll(mode, mediaType)}>
            <Text className="text-sm font-semibold text-gold-300">See all</Text>
          </Pressable>
        ) : null}
      </View>

      {railQuery.isLoading && results.length === 0 ? (
        <DiscoverRailSkeleton />
      ) : null}

      {railQuery.isError ? (
        <ErrorState
          title={`Unable to load ${title.toLowerCase()}`}
          message={getRailErrorMessage(railQuery.error)}
          onRetry={() => railQuery.refetch()}
        />
      ) : null}

      {railQuery.isSuccess && results.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} found`}
          message="Try another discovery mode."
        />
      ) : null}

      {results.length > 0 ? (
        <FlatList
          testID={`discover-rail-${mode}-${mediaType}`}
          horizontal
          onScrollBeginDrag={() => setInteraction('drag', true)}
          onScrollEndDrag={() => setInteraction('drag', false)}
          onMomentumScrollBegin={() => setInteraction('momentum', true)}
          onMomentumScrollEnd={() => setInteraction('momentum', false)}
          extraData={selectedKey}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          data={results}
          initialNumToRender={RAIL_INITIAL_RENDER_COUNT}
          ItemSeparatorComponent={RailSeparator}
          keyExtractor={keyExtractor}
          maxToRenderPerBatch={RAIL_MAX_RENDER_BATCH}
          removeClippedSubviews={false}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          updateCellsBatchingPeriod={RAIL_UPDATE_BATCH_MS}
          windowSize={RAIL_WINDOW_SIZE}
        />
      ) : null}
    </View>
  );
}
