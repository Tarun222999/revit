import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import type { SearchMediaType } from '@/features/discovery/api/search-api';
import { SearchResultCard } from '@/features/discovery/components/SearchResultCard';
import { useSearchTitles } from '@/features/discovery/hooks/useSearchTitles';
import {
  dedupeMediaItems,
  mediaItemKey,
} from '@/features/discovery/utils/dedupeMediaItems';
import { createMediaRouteId } from '@/features/media/api/media-api';
import type { NormalizedMediaItem } from '@/types/media';

const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_INITIAL_RENDER_COUNT = 8;
const SEARCH_MAX_RENDER_BATCH = 8;
const SEARCH_UPDATE_BATCH_MS = 80;
const SEARCH_WINDOW_SIZE = 7;

const SEARCH_MEDIA_FILTERS: Array<{ label: string; value: SearchMediaType }> = [
  { label: 'All', value: 'all' },
  { label: 'Movies', value: 'movie' },
  { label: 'Series', value: 'series' },
  { label: 'Anime', value: 'anime' },
];

function getSearchErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to search right now.';
}

function getResultCountLabel(resultCount: number) {
  return resultCount === 1 ? '1 result' : `${resultCount} results`;
}

function openSearchResult(item: NormalizedMediaItem) {
  router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`);
}

function SearchItemSeparator() {
  return <View className="h-3" />;
}

function SearchHeader({
  isSearchSuccess,
  mediaType,
  query,
  resultCount,
  onClearSearch,
  onMediaTypeChange,
  onQueryChange,
}: {
  isSearchSuccess: boolean;
  mediaType: SearchMediaType;
  query: string;
  resultCount: number;
  onClearSearch: () => void;
  onMediaTypeChange: (mediaType: SearchMediaType) => void;
  onQueryChange: (query: string) => void;
}) {
  return (
    <View className="gap-5">
      <SectionHeader
        title="Search"
        subtitle="Find movies, series, and anime by title."
      />

      <View className="gap-4">
        <TextField
          label="Title"
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search movies, series, or anime"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        <View className="flex-row flex-wrap gap-2">
          {SEARCH_MEDIA_FILTERS.map((filter) => (
            <Chip
              key={filter.value}
              label={filter.label}
              selected={mediaType === filter.value}
              onPress={() => onMediaTypeChange(filter.value)}
            />
          ))}
        </View>
      </View>

      {isSearchSuccess && resultCount > 0 ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-sm font-semibold text-archive-200">
            {getResultCountLabel(resultCount)}
          </Text>
          <Button title="Clear" variant="ghost" onPress={onClearSearch} />
        </View>
      ) : null}
    </View>
  );
}

function SearchEmptyContent({
  canSearch,
  error,
  isError,
  isLoading,
  onClearSearch,
  onRetry,
}: {
  canSearch: boolean;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  onClearSearch: () => void;
  onRetry: () => void;
}) {
  if (!canSearch) {
    return (
      <EmptyState
        title="Start with a title"
        message="Enter at least two characters, then narrow the results by media type."
      />
    );
  }

  if (isLoading) {
    return <LoadingState message="Searching titles" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Search failed"
        message={getSearchErrorMessage(error)}
        onRetry={onRetry}
      />
    );
  }

  return (
    <EmptyState
      title="No results"
      message="Try a different title or media filter."
      actionLabel="Clear search"
      onAction={onClearSearch}
    />
  );
}

/**
 * Renders universal search for normalized movies, series, and anime results.
 *
 * @returns Search input, media filters, and a virtualized result list.
 */
export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<SearchMediaType>('all');
  const searchQuery = useSearchTitles(query, mediaType);
  const results = useMemo(
    () => dedupeMediaItems(searchQuery.data?.results ?? []),
    [searchQuery.data?.results],
  );
  const canSearch = query.trim().length >= SEARCH_MIN_QUERY_LENGTH;
  const keyExtractor = useCallback(
    (item: NormalizedMediaItem) => mediaItemKey(item),
    [],
  );
  const renderItem = useCallback(
    ({ item }: { item: NormalizedMediaItem }) => (
      <SearchResultCard item={item} onPress={() => openSearchResult(item)} />
    ),
    [],
  );
  const clearSearch = useCallback(() => {
    setQuery('');
    setMediaType('all');
  }, []);

  return (
    <Screen padded={false}>
      <FlatList
        data={results}
        initialNumToRender={SEARCH_INITIAL_RENDER_COUNT}
        ItemSeparatorComponent={SearchItemSeparator}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={SEARCH_MAX_RENDER_BATCH}
        removeClippedSubviews
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={SEARCH_UPDATE_BATCH_MS}
        windowSize={SEARCH_WINDOW_SIZE}
        contentContainerClassName="gap-5 px-5 py-6"
        ListHeaderComponent={
          <SearchHeader
            isSearchSuccess={searchQuery.isSuccess}
            mediaType={mediaType}
            query={query}
            resultCount={results.length}
            onClearSearch={clearSearch}
            onMediaTypeChange={setMediaType}
            onQueryChange={setQuery}
          />
        }
        ListEmptyComponent={
          <SearchEmptyContent
            canSearch={canSearch}
            error={searchQuery.error}
            isError={searchQuery.isError}
            isLoading={searchQuery.isLoading}
            onClearSearch={clearSearch}
            onRetry={() => searchQuery.refetch()}
          />
        }
      />
    </Screen>
  );
}
