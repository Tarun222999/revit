import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TextField } from '@/components/ui/TextField';
import {
  useSearchTitles,
} from '@/features/discovery/hooks/useSearchTitles';
import type { SearchMediaType } from '@/features/discovery/api/search-api';
import { createMediaRouteId } from '@/features/media/api/media-api';
import { MEDIA_TYPE_LABELS } from '@/constants/media';

const mediaFilters: Array<{ label: string; value: SearchMediaType }> = [
  { label: 'All', value: 'all' },
  { label: 'Movies', value: 'movie' },
  { label: 'Series', value: 'series' },
  { label: 'Anime', value: 'anime' },
];

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<SearchMediaType>('all');
  const searchQuery = useSearchTitles(query, mediaType);
  const results = searchQuery.data?.results ?? [];
  const canSearch = query.trim().length >= 2;

  return (
    <Screen scroll className="gap-6">
      <SectionHeader
        title="Search"
        subtitle="Phase 2 verification for normalized TMDB media search."
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

      {!canSearch ? (
        <Text className="text-sm leading-5 text-archive-300">
          Enter at least 2 characters to call the media search function.
        </Text>
      ) : null}

      {searchQuery.isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color="#d6a84f" />
        </View>
      ) : null}

      {searchQuery.isError ? (
        <Card>
          <Text className="text-base font-semibold text-reel-300">
            Search failed
          </Text>
          <Text className="mt-2 text-sm leading-5 text-archive-300">
            {searchQuery.error instanceof Error
              ? searchQuery.error.message
              : 'Unable to search right now.'}
          </Text>
        </Card>
      ) : null}

      {canSearch && searchQuery.isSuccess && results.length === 0 ? (
        <Card>
          <Text className="text-base font-semibold text-archive-50">
            No results
          </Text>
          <Text className="mt-2 text-sm leading-5 text-archive-300">
            Try a different title or media filter.
          </Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {results.map((item) => (
          <Pressable
            key={`${item.source}:${item.sourceId}`}
            onPress={() =>
              router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`)
            }>
            <Card className="gap-2">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-base font-semibold text-archive-50">
                    {item.title}
                  </Text>
                  <Text className="text-sm text-archive-300">
                    {MEDIA_TYPE_LABELS[item.mediaType]}
                    {item.year ? ` • ${item.year}` : ''}
                  </Text>
                </View>
                <Text className="text-xs font-semibold uppercase text-gold-300">
                  {item.source}
                </Text>
              </View>
              {item.description ? (
                <Text
                  className="text-sm leading-5 text-archive-300"
                  numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
