import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
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
        <View className={index === 0 ? 'w-32 gap-2' : 'mt-7 w-24 gap-2'} key={index}>
          <View
            className={
              index === 0
                ? 'h-44 rounded-app bg-archive-800'
                : 'h-36 rounded-app bg-archive-800'
            }
          />
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
}: DiscoverRailProps) {
  const railQuery = useDiscoverRail(mode, mediaType);
  const results = useMemo(
    () =>
      dedupeMediaItems(railQuery.data?.results ?? []).slice(
        0,
        RAIL_RESULT_LIMIT,
      ),
    [railQuery.data?.results],
  );
  const keyExtractor = useCallback(
    (item: NormalizedMediaItem) => mediaItemKey(item),
    [],
  );
  const renderItem = useCallback(
    ({ item, index }: { item: NormalizedMediaItem; index: number }) => (
      <DiscoverPosterCard
        emphasis={index === 0 ? 'lead' : 'standard'}
        item={item}
        onPress={() => openRailTitleDetails(item)}
      />
    ),
    [],
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
            <Text className="text-sm font-semibold text-gold-300">
              See all
            </Text>
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
          horizontal
          data={results}
          initialNumToRender={RAIL_INITIAL_RENDER_COUNT}
          ItemSeparatorComponent={RailSeparator}
          keyExtractor={keyExtractor}
          maxToRenderPerBatch={RAIL_MAX_RENDER_BATCH}
          removeClippedSubviews
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          updateCellsBatchingPeriod={RAIL_UPDATE_BATCH_MS}
          windowSize={RAIL_WINDOW_SIZE}
        />
      ) : null}
    </View>
  );
}
