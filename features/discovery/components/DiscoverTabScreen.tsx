import { router, type Href } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { DiscoverScreen } from '@/features/discovery/components/DiscoverScreen';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';

export function DiscoverTabScreen() {
  const openDiscoverListing = (
    mode: DiscoveryMode,
    mediaType: DiscoveryMediaType,
  ) => {
    router.push(`/discover/${mode}/${mediaType}` as Href);
  };

  return (
    <Screen scroll className="gap-6">
      <DiscoverScreen onSeeAll={openDiscoverListing} />
    </Screen>
  );
}
