import { useEffect, useState } from 'react';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppColors } from '@/constants/theme';
import { Pressable, Text, View } from 'react-native';
import { DISCOVERY_MODES, type DiscoveryMode } from '@/types/discovery';

const modeLabels: Record<DiscoveryMode, string> = {
  trending: 'Trending',
  new_releases: 'New Releases',
  top_rated: 'Top Rated',
};

const modeDescriptions: Record<Exclude<DiscoveryMode, 'trending'>, string> = {
  new_releases: 'Recently released and newly airing titles.',
  top_rated: 'Highly rated picks from the catalog.',
};

export function getDiscoverModeDescription(
  mode: DiscoveryMode,
  gamesEnabled: boolean,
) {
  if (mode === 'trending') {
    return gamesEnabled
      ? 'Popular right now across movies, series, anime, and games.'
      : 'Popular right now across movies, series, and anime.';
  }

  return modeDescriptions[mode];
}

type DiscoverModeBarProps = {
  gamesEnabled?: boolean;
  reducedMotion?: boolean;
  value: DiscoveryMode;
  onChange: (mode: DiscoveryMode) => void;
};

export function DiscoverModeBar({
  gamesEnabled = false,
  reducedMotion = false,
  value,
  onChange,
}: DiscoverModeBarProps) {
  const [width, setWidth] = useState(0);
  const position = useSharedValue(DISCOVERY_MODES.indexOf(value));
  useEffect(() => {
    cancelAnimation(position);
    const next = DISCOVERY_MODES.indexOf(value);
    position.value = reducedMotion
      ? next
      : withTiming(next, {
          duration: 320,
          reduceMotion: ReduceMotion.Never,
        });
    return () => cancelAnimation(position);
  }, [value, reducedMotion, position]);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (position.value * width) / DISCOVERY_MODES.length },
    ],
  }));
  return (
    <View className="gap-3">
      <Text className="text-sm leading-5 text-archive-300">
        {getDiscoverModeDescription(value, gamesEnabled)}
      </Text>

      <View
        accessibilityRole="tablist"
        className="flex-row border-b border-archive-700"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              bottom: 0,
              height: 2,
              width: width / DISCOVERY_MODES.length,
              backgroundColor: AppColors.gold[400],
            },
            indicatorStyle,
          ]}
        />
        {DISCOVERY_MODES.map((mode) => (
          <Pressable
            accessibilityLabel={`${modeLabels[mode]} discovery mode`}
            accessibilityRole="tab"
            accessibilityState={{ selected: value === mode }}
            key={mode}
            onPress={() => onChange(mode)}
            className="min-h-11 flex-1 items-center justify-center border-b-2 border-transparent px-1">
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
