import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DiscoverFeaturePresentation } from '@/features/discovery/components/DiscoverFeaturePresentation';
import { DiscoverModeBar } from '@/features/discovery/components/DiscoverModeBar';
import { DiscoverRail } from '@/features/discovery/components/DiscoverRail';
import { useDiscoverRail } from '@/features/discovery/hooks/useDiscoverRail';
import {
  dedupeMediaItems,
  mediaItemKey,
} from '@/features/discovery/utils/dedupeMediaItems';
import { createMediaRouteId } from '@/features/media/api/media-api';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverScreenProps = {
  onSeeAll?: (mode: DiscoveryMode, mediaType: DiscoveryMediaType) => void;
};

const railConfig: Array<{
  title: string;
  mediaType: DiscoveryMediaType;
}> = [
  { title: 'Movies', mediaType: 'movie' },
  { title: 'Series', mediaType: 'series' },
  { title: 'Anime', mediaType: 'anime' },
];

type FeatureRailQuery = ReturnType<typeof useDiscoverRail>;

/**
 * Picks the first usable feature in the approved media priority order.
 * A lower-priority result is not used until every higher-priority rail settles.
 */
export function getFeaturedTitle(
  queries: FeatureRailQuery[],
): NormalizedMediaItem | null | undefined {
  for (const query of queries) {
    if (query.isPlaceholderData) {
      return undefined;
    }

    const item = dedupeMediaItems(query.data?.results ?? []).find(
      (result) => Boolean(result.source && result.sourceId && result.title.trim()),
    );

    if (item) {
      return item;
    }

    if (!query.isSuccess && !query.isError) {
      return undefined;
    }
  }

  return null;
}

function openFeatureTitleDetails(item: NormalizedMediaItem) {
  router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`);
}

export function DiscoverScreen({ onSeeAll }: DiscoverScreenProps) {
  const [mode, setMode] = useState<DiscoveryMode>('trending');
  const [displayedFeature, setDisplayedFeature] =
    useState<NormalizedMediaItem | null>(null);
  const movieQuery = useDiscoverRail(mode, 'movie');
  const seriesQuery = useDiscoverRail(mode, 'series');
  const animeQuery = useDiscoverRail(mode, 'anime');
  const candidateFeature = useMemo(
    () => getFeaturedTitle([movieQuery, seriesQuery, animeQuery]),
    [animeQuery, movieQuery, seriesQuery],
  );

  useEffect(() => {
    if (candidateFeature) {
      setDisplayedFeature((current) =>
        current && mediaItemKey(current) === mediaItemKey(candidateFeature)
          ? current
          : candidateFeature,
      );
    }
  }, [candidateFeature]);

  const featureLoading = candidateFeature === undefined;

  return (
    <View className="gap-7">
      <Text className="font-serif text-3xl leading-9 text-archive-100">
        Find something worth your time.
      </Text>

      <DiscoverModeBar value={mode} onChange={setMode} />

      <DiscoverFeaturePresentation
        item={displayedFeature}
        loading={featureLoading}
        onPress={openFeatureTitleDetails}
      />

      {railConfig.map((rail) => (
        <DiscoverRail
          key={rail.mediaType}
          title={rail.title}
          mode={mode}
          mediaType={rail.mediaType}
          onSeeAll={onSeeAll}
        />
      ))}
    </View>
  );
}
