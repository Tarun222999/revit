import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { DiscoverPosterCard } from '@/features/discovery/components/DiscoverPosterCard';
import { useDiscoverRail } from '@/features/discovery/hooks/useDiscoverRail';
import {
  dedupeMediaItems,
  mediaItemKey,
} from '@/features/discovery/utils/dedupeMediaItems';
import { createMediaRouteId } from '@/features/media/api/media-api';
import {
  isDiscoveryMediaType,
  isDiscoveryMode,
  type DiscoveryMediaType,
  type DiscoveryMode,
} from '@/types/discovery';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverListingScreenProps = {
  mode?: string;
  mediaType?: string;
};

const modeLabels: Record<DiscoveryMode, string> = {
  trending: 'Trending',
  new_releases: 'New Releases',
  top_rated: 'Top Rated',
};

const mediaTypeLabels: Record<DiscoveryMediaType, string> = {
  movie: 'Movies',
  series: 'Series',
  anime: 'Anime',
};

const modeDescriptions: Record<DiscoveryMode, string> = {
  trending: 'Fresh activity from the wider entertainment shelf.',
  new_releases: 'Recent releases gathered for quick browsing.',
  top_rated: 'High-rated titles surfaced for slower, pickier browsing.',
};

const mediaTypeDescriptions: Record<DiscoveryMediaType, string> = {
  movie: 'Feature-length picks from TMDB.',
  series: 'Series and episodic titles ready to inspect.',
  anime: 'Anime-leaning series filtered from discovery data.',
};

function formatCachedAt(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ListingHeader({
  cachedAt,
  mediaType,
  mode,
  resultCount,
}: {
  cachedAt?: string;
  mediaType: DiscoveryMediaType;
  mode: DiscoveryMode;
  resultCount: number;
}) {
  const refreshedAt = formatCachedAt(cachedAt);

  return (
    <View className="gap-5">
      <View className="gap-3 rounded-app border border-archive-700 bg-archive-800 p-4">
        <View className="flex-row flex-wrap gap-2">
          <View className="rounded-full bg-gold-400 px-3 py-1">
            <Text className="text-xs font-bold uppercase text-archive-900">
              {modeLabels[mode]}
            </Text>
          </View>
          <View className="rounded-full border border-teal-500 px-3 py-1">
            <Text className="text-xs font-bold uppercase text-teal-300">
              {mediaTypeLabels[mediaType]}
            </Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-3xl font-bold leading-10 text-archive-50">
            {modeLabels[mode]} {mediaTypeLabels[mediaType]}
          </Text>
          <Text className="text-sm leading-5 text-archive-200">
            {modeDescriptions[mode]} {mediaTypeDescriptions[mediaType]}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="rounded bg-shelf-700 px-2.5 py-1 text-xs font-semibold text-archive-100">
            {resultCount} shown
          </Text>
          {refreshedAt ? (
            <Text className="rounded bg-archive-700 px-2.5 py-1 text-xs font-semibold text-archive-300">
              Refreshed {refreshedAt}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ListingFooter({
  canLoadMore,
  isLoadingNextPage,
}: {
  canLoadMore: boolean;
  isLoadingNextPage: boolean;
}) {
  return (
    <View className="gap-3 pb-4 pt-1">
      {isLoadingNextPage ? (
        <View className="flex-row items-center justify-center gap-2 rounded-app border border-archive-700 bg-archive-800 px-4 py-3">
          <ActivityIndicator color="#d7a94d" />
          <Text className="text-center text-xs leading-4 text-archive-300">
            Loading more titles
          </Text>
        </View>
      ) : canLoadMore ? (
        <Text className="text-center text-xs leading-4 text-archive-300">
          Scroll for more
        </Text>
      ) : (
        <Text className="rounded-app border border-archive-700 bg-archive-800 px-4 py-3 text-center text-sm font-semibold text-archive-300">
          You reached the end of this browse shelf.
        </Text>
      )}
    </View>
  );
}

function DiscoverListingContent({
  mode,
  mediaType,
}: {
  mode: DiscoveryMode;
  mediaType: DiscoveryMediaType;
}) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resultsByPage, setResultsByPage] = useState<
    Record<number, NormalizedMediaItem[]>
  >({});
  const requestedPagesRef = useRef(new Set<number>([1]));
  const listingQuery = useDiscoverRail(mode, mediaType, page);

  useEffect(() => {
    setPage(1);
    setTotalPages(1);
    setResultsByPage({});
    requestedPagesRef.current = new Set([1]);
  }, [mode, mediaType]);

  useEffect(() => {
    if (listingQuery.data) {
      setTotalPages(listingQuery.data.totalPages);
      setResultsByPage((current) => ({
        ...current,
        [listingQuery.data.page]: listingQuery.data.results,
      }));
    }
  }, [listingQuery.data]);

  const results = useMemo(
    () =>
      dedupeMediaItems(
        Object.entries(resultsByPage)
          .sort(([left], [right]) => Number(left) - Number(right))
          .flatMap(([, pageResults]) => pageResults),
      ),
    [resultsByPage],
  );
  const title = `${modeLabels[mode]} ${mediaTypeLabels[mediaType]}`;
  const canLoadMore = page < totalPages;
  const isLoadingNextPage = listingQuery.isFetching && results.length > 0;
  const keyExtractor = useCallback(
    (item: NormalizedMediaItem) => mediaItemKey(item),
    [],
  );
  const renderItem = useCallback(
    ({ item }: { item: NormalizedMediaItem }) => (
      <DiscoverPosterCard
        className="flex-1"
        item={item}
        variant="listing"
        onPress={() =>
          router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`)
        }
      />
    ),
    [],
  );
  const loadMore = useCallback(() => {
    setPage((current) => {
      const nextPage = current + 1;

      if (
        listingQuery.isFetching ||
        listingQuery.isError ||
        current >= totalPages ||
        requestedPagesRef.current.has(nextPage)
      ) {
        return current;
      }

      requestedPagesRef.current.add(nextPage);

      return nextPage;
    });
  }, [listingQuery.isError, listingQuery.isFetching, totalPages]);

  return (
    <Screen padded={false}>
      <FlatList
        data={results}
        initialNumToRender={8}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={8}
        numColumns={2}
        removeClippedSubviews
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        updateCellsBatchingPeriod={80}
        windowSize={7}
        columnWrapperClassName="gap-3"
        contentContainerClassName="gap-3 px-5 py-6"
        ListHeaderComponent={
          <ListingHeader
            cachedAt={listingQuery.data?.cachedAt}
            mediaType={mediaType}
            mode={mode}
            resultCount={results.length}
          />
        }
        ListEmptyComponent={
          listingQuery.isLoading ? (
            <View className="pt-2">
              <LoadingState message={`Loading ${title.toLowerCase()}`} />
            </View>
          ) : listingQuery.isError ? (
            <View className="pt-2">
              <ErrorState
                title="Unable to load discovery"
                message={
                  listingQuery.error instanceof Error
                    ? listingQuery.error.message
                    : 'Discovery data is unavailable right now.'
                }
                onRetry={() => listingQuery.refetch()}
              />
            </View>
          ) : (
            <View className="pt-2">
              <EmptyState
                title="Nothing here yet"
                message="Try another discovery mode or media type."
              />
            </View>
          )
        }
        ListFooterComponent={
          results.length > 0 ? (
            <View className="gap-3">
              {listingQuery.isError ? (
                <ErrorState
                  title="Unable to load more"
                  message={
                    listingQuery.error instanceof Error
                      ? listingQuery.error.message
                      : 'More discovery results are unavailable right now.'
                  }
                  onRetry={() => listingQuery.refetch()}
                />
              ) : null}

              <ListingFooter
                canLoadMore={canLoadMore}
                isLoadingNextPage={isLoadingNextPage}
              />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

export function DiscoverListingScreen({
  mode,
  mediaType,
}: DiscoverListingScreenProps) {
  if (
    !mode ||
    !mediaType ||
    !isDiscoveryMode(mode) ||
    !isDiscoveryMediaType(mediaType)
  ) {
    return (
      <Screen className="justify-center">
        <EmptyState
          title="Discovery shelf not found"
          message="This discovery collection is not available."
          actionLabel="Back to Home"
          onAction={() => router.replace('/home')}
        />
      </Screen>
    );
  }

  return <DiscoverListingContent mode={mode} mediaType={mediaType} />;
}
