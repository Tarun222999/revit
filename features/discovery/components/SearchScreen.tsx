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

const mediaFilters: Array<{ label: string; value: SearchMediaType }> = [
  { label: 'All', value: 'all' },
  { label: 'Movies', value: 'movie' },
  { label: 'Series', value: 'series' },
  { label: 'Anime', value: 'anime' },
];

function SearchItemSeparator() {
  return <View className="h-3" />;
}

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<SearchMediaType>('all');
  const searchQuery = useSearchTitles(query, mediaType);
  const results = useMemo(
    () => dedupeMediaItems(searchQuery.data?.results ?? []),
    [searchQuery.data?.results],
  );
  const canSearch = query.trim().length >= 2;
  const keyExtractor = useCallback((item: NormalizedMediaItem) => mediaItemKey(item), []);
  const renderItem = useCallback(
    ({ item }: { item: NormalizedMediaItem }) => (
      <SearchResultCard
        item={item}
        onPress={() =>
          router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`)
        }
      />
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
        initialNumToRender={8}
        ItemSeparatorComponent={SearchItemSeparator}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={8}
        removeClippedSubviews
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={80}
        windowSize={7}
        contentContainerClassName="gap-5 px-5 py-6"
        ListHeaderComponent={
          <View className="gap-5">
            <SectionHeader
              title="Search"
              subtitle="Find movies, series, and anime by title."
            />

            <View className="gap-4">
              <TextField
                label="Title"
                value={query}
                onChangeText={setQuery}
                placeholder="Search movies, series, or anime"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />

              <View className="flex-row flex-wrap gap-2">
                {mediaFilters.map((filter) => (
                  <Chip
                    key={filter.value}
                    label={filter.label}
                    selected={mediaType === filter.value}
                    onPress={() => setMediaType(filter.value)}
                  />
                ))}
              </View>
            </View>

            {searchQuery.isSuccess && results.length > 0 ? (
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-sm font-semibold text-archive-200">
                  {results.length === 1 ? '1 result' : `${results.length} results`}
                </Text>
                <Button title="Clear" variant="ghost" onPress={clearSearch} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !canSearch ? (
            <EmptyState
              title="Start with a title"
              message="Enter at least two characters, then narrow the results by media type."
            />
          ) : searchQuery.isLoading ? (
            <LoadingState message="Searching titles" />
          ) : searchQuery.isError ? (
            <ErrorState
              title="Search failed"
              message={
                searchQuery.error instanceof Error
                  ? searchQuery.error.message
                  : 'Unable to search right now.'
              }
              onRetry={() => searchQuery.refetch()}
            />
          ) : (
            <EmptyState
              title="No results"
              message="Try a different title or media filter."
              actionLabel="Clear search"
              onAction={clearSearch}
            />
          )
        }
      />
    </Screen>
  );
}
