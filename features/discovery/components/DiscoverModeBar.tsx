import { Pressable, Text, View } from 'react-native';
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
      <Text className="text-sm leading-5 text-archive-300">
        {modeDescriptions[value]}
      </Text>

      <View accessibilityRole="tablist" className="flex-row border-b border-archive-700">
        {DISCOVERY_MODES.map((mode) => (
          <Pressable
            accessibilityLabel={`${modeLabels[mode]} discovery mode`}
            accessibilityRole="tab"
            accessibilityState={{ selected: value === mode }}
            key={mode}
            onPress={() => onChange(mode)}
            className={`min-h-11 flex-1 items-center justify-center border-b-2 px-1 ${
              value === mode ? 'border-gold-400' : 'border-transparent'
            }`}>
            <Text
              className={`text-center text-xs font-bold ${
                value === mode ? 'text-archive-50' : 'text-archive-400'
              }`}>
              {modeLabels[mode]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
