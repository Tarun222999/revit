import { Stack, useLocalSearchParams } from 'expo-router';

import { DiscoverListingScreen } from '@/features/discovery/components/DiscoverListingScreen';
import {
  isDiscoveryMediaType,
  isDiscoveryMode,
  type DiscoveryMediaType,
  type DiscoveryMode,
} from '@/types/discovery';

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

export default function DiscoverListingRoute() {
  const { mode, mediaType } = useLocalSearchParams<{
    mode: string;
    mediaType: string;
  }>();
  const title =
    isDiscoveryMode(mode) && isDiscoveryMediaType(mediaType)
      ? `${modeLabels[mode]} ${mediaTypeLabels[mediaType]}`
      : 'Discovery';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <DiscoverListingScreen mode={mode} mediaType={mediaType} />
    </>
  );
}
