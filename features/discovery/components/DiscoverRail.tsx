import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
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

const RAIL_CARD_WIDTH = 112;
const RAIL_CARD_GAP = 12;
const RAIL_ITEM_LENGTH = RAIL_CARD_WIDTH + RAIL_CARD_GAP;

function RailSeparator() {
  return <View className="w-3" />;
}

export function DiscoverRail({
  title,
  mode,
  mediaType,
  onSeeAll,
}: DiscoverRailProps) {
  const railQuery = useDiscoverRail(mode, mediaType);
  const results = useMemo(
    () => dedupeMediaItems(railQuery.data?.results ?? []).slice(0, 10),
    [railQuery.data?.results],
  );
  const keyExtractor = useCallback((item: NormalizedMediaItem) => mediaItemKey(item), []);
  const renderItem = useCallback(
    ({ item }: { item: NormalizedMediaItem }) => (
      <DiscoverPosterCard
        item={item}
        onPress={() =>
          router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`)
        }
      />
    ),
    [],
  );
  const getItemLayout = useCallback(
    (_: ArrayLike<NormalizedMediaItem> | null | undefined, index: number) => ({
      length: RAIL_ITEM_LENGTH,
      offset: RAIL_ITEM_LENGTH * index,
      index,
    }),
    [],
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-2xl font-bold text-archive-50">{title}</Text>

        {onSeeAll ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onSeeAll(mode, mediaType)}>
            <Text className="text-sm font-semibold text-gold-300">
              See all
            </Text>
          </Pressable>
        ) : null}
      </View>

      {railQuery.isLoading ? (
        <LoadingState message={`Loading ${title.toLowerCase()}`} />
      ) : null}

      {railQuery.isError ? (
        <ErrorState
          title={`Unable to load ${title.toLowerCase()}`}
          message={
            railQuery.error instanceof Error
              ? railQuery.error.message
              : 'Discovery data is unavailable right now.'
          }
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
          getItemLayout={getItemLayout}
          initialNumToRender={5}
          ItemSeparatorComponent={RailSeparator}
          keyExtractor={keyExtractor}
          maxToRenderPerBatch={5}
          removeClippedSubviews
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          updateCellsBatchingPeriod={80}
          windowSize={5}
        />
      ) : null}
    </View>
  );
}
