import { useState } from 'react';
import { View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { DiscoverModeBar } from '@/features/discovery/components/DiscoverModeBar';
import { DiscoverRail } from '@/features/discovery/components/DiscoverRail';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';

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

export function DiscoverScreen({ onSeeAll }: DiscoverScreenProps) {
  const [mode, setMode] = useState<DiscoveryMode>('trending');

  return (
    <View className="gap-7">
      <View className="gap-2">
        <SectionHeader
          title="Discover"
          subtitle="Movies, series, and anime worth browsing now."
        />
      </View>

      <DiscoverModeBar value={mode} onChange={setMode} />

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
