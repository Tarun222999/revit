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

type ListingResultsByPage = Record<number, NormalizedMediaItem[]>;

const LISTING_FIRST_PAGE = 1;
const LISTING_COLUMN_COUNT = 2;
const LISTING_INITIAL_RENDER_COUNT = 8;
const LISTING_MAX_RENDER_BATCH = 8;
const LISTING_END_REACHED_THRESHOLD = 0.45;
const LISTING_UPDATE_BATCH_MS = 80;
const LISTING_WINDOW_SIZE = 7;

const DISCOVERY_MODE_LABELS: Record<DiscoveryMode, string> = {
  trending: 'Trending',
  new_releases: 'New Releases',
  top_rated: 'Top Rated',
};

const DISCOVERY_MEDIA_TYPE_LABELS: Record<DiscoveryMediaType, string> = {
  movie: 'Movies',
  series: 'Series',
  anime: 'Anime',
};

const DISCOVERY_MODE_DESCRIPTIONS: Record<DiscoveryMode, string> = {
  trending: 'Fresh activity from the wider entertainment shelf.',
  new_releases: 'Recent releases gathered for quick browsing.',
  top_rated: 'High-rated titles surfaced for slower, pickier browsing.',
};

const DISCOVERY_MEDIA_TYPE_DESCRIPTIONS: Record<DiscoveryMediaType, string> = {
  movie: 'Feature-length picks from TMDB.',
  series: 'Series and episodic titles ready to inspect.',
  anime: 'Anime-leaning series filtered from discovery data.',
};

function formatCachedAtTime(value?: string) {
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

function getDiscoveryErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getOrderedListingResults(resultsByPage: ListingResultsByPage) {
  return dedupeMediaItems(
    Object.entries(resultsByPage)
      .sort(([leftPage], [rightPage]) => Number(leftPage) - Number(rightPage))
      .flatMap(([, pageResults]) => pageResults),
  );
}

function canRequestNextListingPage({
  currentPage,
  isError,
  isFetching,
  requestedPages,
  totalPages,
}: {
  currentPage: number;
  isError: boolean;
  isFetching: boolean;
  requestedPages: Set<number>;
  totalPages: number;
}) {
  const nextPage = currentPage + 1;

  return (
    !isFetching &&
    !isError &&
    currentPage < totalPages &&
    !requestedPages.has(nextPage)
  );
}

function openTitleDetails(item: NormalizedMediaItem) {
  router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`);
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
  const refreshedAt = formatCachedAtTime(cachedAt);

  return (
    <View className="gap-5">
      <View className="gap-3 rounded-app border border-archive-700 bg-archive-800 p-4">
        <View className="flex-row flex-wrap gap-2">
          <View className="rounded-full bg-gold-400 px-3 py-1">
            <Text className="text-xs font-bold uppercase text-archive-900">
              {DISCOVERY_MODE_LABELS[mode]}
            </Text>
          </View>
          <View className="rounded-full border border-teal-500 px-3 py-1">
            <Text className="text-xs font-bold uppercase text-teal-300">
              {DISCOVERY_MEDIA_TYPE_LABELS[mediaType]}
            </Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-3xl font-bold leading-10 text-archive-50">
            {DISCOVERY_MODE_LABELS[mode]} {DISCOVERY_MEDIA_TYPE_LABELS[mediaType]}
          </Text>
          <Text className="text-sm leading-5 text-archive-200">
            {DISCOVERY_MODE_DESCRIPTIONS[mode]}{' '}
            {DISCOVERY_MEDIA_TYPE_DESCRIPTIONS[mediaType]}
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

function ListingEmptyContent({
  error,
  isError,
  isLoading,
  title,
  onRetry,
}: {
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  title: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View className="pt-2">
        <LoadingState message={`Loading ${title.toLowerCase()}`} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="pt-2">
        <ErrorState
          title="Unable to load discovery"
          message={getDiscoveryErrorMessage(
            error,
            'Discovery data is unavailable right now.',
          )}
          onRetry={onRetry}
        />
      </View>
    );
  }

  return (
    <View className="pt-2">
      <EmptyState
        title="Nothing here yet"
        message="Try another discovery mode or media type."
      />
    </View>
  );
}

function ListingLoadMoreError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <ErrorState
      title="Unable to load more"
      message={getDiscoveryErrorMessage(
        error,
        'More discovery results are unavailable right now.',
      )}
      onRetry={onRetry}
    />
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

/**
 * Renders a paginated, browse-only discovery listing for a validated mode and
 * media type.
 *
 * @param mode - Discovery rail mode used to fetch the listing.
 * @param mediaType - Media category used to fetch and label the listing.
 * @returns A FlatList-based screen of normalized media results.
 */
function DiscoverListingContent({
  mode,
  mediaType,
}: {
  mode: DiscoveryMode;
  mediaType: DiscoveryMediaType;
}) {
  const [page, setPage] = useState(LISTING_FIRST_PAGE);
  const [totalPages, setTotalPages] = useState(LISTING_FIRST_PAGE);
  const [resultsByPage, setResultsByPage] = useState<ListingResultsByPage>({});
  const requestedPagesRef = useRef(new Set<number>([LISTING_FIRST_PAGE]));
  const listingQuery = useDiscoverRail(mode, mediaType, page);

  useEffect(() => {
    setPage(LISTING_FIRST_PAGE);
    setTotalPages(LISTING_FIRST_PAGE);
    setResultsByPage({});
    requestedPagesRef.current = new Set([LISTING_FIRST_PAGE]);
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
    () => getOrderedListingResults(resultsByPage),
    [resultsByPage],
  );
  const title = `${DISCOVERY_MODE_LABELS[mode]} ${DISCOVERY_MEDIA_TYPE_LABELS[mediaType]}`;
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
        onPress={() => openTitleDetails(item)}
      />
    ),
    [],
  );
  const loadMore = useCallback(() => {
    setPage((currentPage) => {
      if (
        !canRequestNextListingPage({
          currentPage,
          isError: listingQuery.isError,
          isFetching: listingQuery.isFetching,
          requestedPages: requestedPagesRef.current,
          totalPages,
        })
      ) {
        return currentPage;
      }

      const nextPage = currentPage + 1;
      requestedPagesRef.current.add(nextPage);

      return nextPage;
    });
  }, [listingQuery.isError, listingQuery.isFetching, totalPages]);

  return (
    <Screen padded={false}>
      <FlatList
        data={results}
        initialNumToRender={LISTING_INITIAL_RENDER_COUNT}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={LISTING_MAX_RENDER_BATCH}
        numColumns={LISTING_COLUMN_COUNT}
        removeClippedSubviews
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={LISTING_END_REACHED_THRESHOLD}
        updateCellsBatchingPeriod={LISTING_UPDATE_BATCH_MS}
        windowSize={LISTING_WINDOW_SIZE}
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
          <ListingEmptyContent
            error={listingQuery.error}
            isError={listingQuery.isError}
            isLoading={listingQuery.isLoading}
            title={title}
            onRetry={() => listingQuery.refetch()}
          />
        }
        ListFooterComponent={
          results.length > 0 ? (
            <View className="gap-3">
              {listingQuery.isError ? (
                <ListingLoadMoreError
                  error={listingQuery.error}
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

/**
 * Validates route params and renders the full discovery shelf listing.
 *
 * @param mode - Route param for the discovery mode.
 * @param mediaType - Route param for the discovery media category.
 * @returns The listing screen or a route-level empty state for invalid params.
 */
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
          actionLabel="Back to Discover"
          onAction={() => router.replace('/(tabs)')}
        />
      </Screen>
    );
  }

  return <DiscoverListingContent mode={mode} mediaType={mediaType} />;
}
