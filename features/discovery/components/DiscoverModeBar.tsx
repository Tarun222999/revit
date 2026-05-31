import { Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import {
  DISCOVERY_MODES,
  type DiscoveryMode,
} from '@/types/discovery';

const modeLabels: Record<DiscoveryMode, string> = {
  trending: 'Trending',
  new_releases: 'New Releases',
  top_rated: 'Top Rated',
};

const modeDescriptions: Record<DiscoveryMode, string> = {
  trending: 'Popular right now across movies, series, and anime.',
  new_releases: 'Recently released and newly airing titles.',
  top_rated: 'Highly rated picks from the catalog.',
};

type DiscoverModeBarProps = {
  value: DiscoveryMode;
  onChange: (mode: DiscoveryMode) => void;
};

export function DiscoverModeBar({ value, onChange }: DiscoverModeBarProps) {
  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-sm font-semibold uppercase text-gold-300">
          Continue exploring
        </Text>
        <Text className="text-sm leading-5 text-archive-300">
          {modeDescriptions[value]}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {DISCOVERY_MODES.map((mode) => (
          <Chip
            key={mode}
            label={modeLabels[mode]}
            selected={value === mode}
            onPress={() => onChange(mode)}
          />
        ))}
      </View>
    </View>
  );
}
