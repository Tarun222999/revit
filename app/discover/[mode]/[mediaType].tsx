import { useLocalSearchParams } from 'expo-router';

import { DiscoverListingScreen } from '@/features/discovery/components/DiscoverListingScreen';

export default function DiscoverListingRoute() {
  const { mode, mediaType } = useLocalSearchParams<{
    mode: string;
    mediaType: string;
  }>();

  return <DiscoverListingScreen mode={mode} mediaType={mediaType} />;
}
