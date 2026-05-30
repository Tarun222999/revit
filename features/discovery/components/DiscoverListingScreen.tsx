import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DiscoverPosterCard } from '@/features/discovery/components/DiscoverPosterCard';
import { useDiscoverRail } from '@/features/discovery/hooks/useDiscoverRail';
import { dedupeMediaItems } from '@/features/discovery/utils/dedupeMediaItems';
import { createMediaRouteId } from '@/features/media/api/media-api';
import type { NormalizedMediaItem } from '@/types/media';
import {
  isDiscoveryMediaType,
  isDiscoveryMode,
  type DiscoveryMediaType,
  type DiscoveryMode,
} from '@/types/discovery';

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

function DiscoverListingContent({
  mode,
  mediaType,
}: {
  mode: DiscoveryMode;
  mediaType: DiscoveryMediaType;
}) {
  const [page, setPage] = useState(1);
  const [resultsByPage, setResultsByPage] = useState<
    Record<number, NormalizedMediaItem[]>
  >({});
  const listingQuery = useDiscoverRail(mode, mediaType, page);

  useEffect(() => {
    setPage(1);
    setResultsByPage({});
  }, [mode, mediaType]);

  useEffect(() => {
    if (listingQuery.data) {
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
  const totalPages = listingQuery.data?.totalPages ?? page;
  const canLoadMore = page < totalPages;

  return (
    <Screen padded={false}>
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.source}:${item.sourceId}`}
        numColumns={2}
        columnWrapperClassName="gap-4"
        contentContainerClassName="gap-5 px-5 py-6"
        ListHeaderComponent={
          <View className="gap-4">
            <SectionHeader
              title={title}
              subtitle="Browse the full rail without leaving discovery mode."
            />
          </View>
        }
        ListEmptyComponent={
          listingQuery.isLoading ? (
            <LoadingState message={`Loading ${title.toLowerCase()}`} />
          ) : listingQuery.isError ? (
            <ErrorState
              title="Unable to load discovery"
              message={
                listingQuery.error instanceof Error
                  ? listingQuery.error.message
                  : 'Discovery data is unavailable right now.'
              }
              onRetry={() => listingQuery.refetch()}
            />
          ) : (
            <EmptyState
              title="Nothing here yet"
              message="Try another discovery mode or media type."
            />
          )
        }
        renderItem={({ item }) => (
          <DiscoverPosterCard
            item={item}
            onPress={() =>
              router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`)
            }
          />
        )}
        ListFooterComponent={
          results.length > 0 ? (
            <View className="gap-3 pb-4 pt-1">
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

              {canLoadMore ? (
                <Button
                  title="Load more"
                  variant="secondary"
                  loading={listingQuery.isFetching}
                  onPress={() => setPage((current) => current + 1)}
                />
              ) : (
                <Text className="text-center text-sm text-archive-300">
                  End of this shelf
                </Text>
              )}
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
  if (!mode || !mediaType || !isDiscoveryMode(mode) || !isDiscoveryMediaType(mediaType)) {
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
