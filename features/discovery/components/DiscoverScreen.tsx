import { router } from 'expo-router';
import PagerView, { type PagerViewRef } from '@/components/ui/PagerView';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAppCapabilities } from '@/features/capabilities/context/AppCapabilitiesProvider';
import { DiscoverFeaturePresentation } from '@/features/discovery/components/DiscoverFeaturePresentation';
import { DiscoverModeBar } from '@/features/discovery/components/DiscoverModeBar';
import { DiscoverRail } from '@/features/discovery/components/DiscoverRail';
import { useDiscoverRail } from '@/features/discovery/hooks/useDiscoverRail';
import { dedupeMediaItems, mediaItemKey } from '@/features/discovery/utils/dedupeMediaItems';
import { createMediaRouteId } from '@/features/media/api/media-api';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';
import type { NormalizedMediaItem } from '@/types/media';

type DiscoverScreenProps = {
  onSeeAll?: (mode: DiscoveryMode, mediaType: DiscoveryMediaType) => void;
};
const modes: DiscoveryMode[] = ["trending", "new_releases", "top_rated"];
const baseRailConfig: Array<{ title: string; mediaType: DiscoveryMediaType }> =
  [
    { title: "Movies", mediaType: "movie" },
    { title: "Series", mediaType: "series" },
    { title: "Anime", mediaType: "anime" },
  ];
type FeatureRailQuery = ReturnType<typeof useDiscoverRail>;
export function getDiscoverRailConfig(gamesEnabled: boolean) {
  return gamesEnabled
    ? [...baseRailConfig, { title: "Games", mediaType: "game" as const }]
    : baseRailConfig;
}
export function getFeaturedTitle(
  queries: FeatureRailQuery[],
): NormalizedMediaItem | null | undefined {
  for (const query of queries) {
    if (query.isPlaceholderData) return undefined;
    const item = dedupeMediaItems(query.data?.results ?? []).find((result) =>
      Boolean(result.source && result.sourceId && result.title.trim()),
    );
    if (item) return item;
    if (!query.isSuccess && !query.isError) return undefined;
  }
  return null;
}
function DiscoverModePage({
  mode,
  active,
  onSeeAll,
  gamesEnabled,
}: DiscoverScreenProps & {
  mode: DiscoveryMode;
  active: boolean;
  gamesEnabled: boolean;
}) {
  const [feature, setFeature] = useState<NormalizedMediaItem | null>(null);
  const movie = useDiscoverRail(mode, "movie", 1, active);
  const series = useDiscoverRail(mode, "series", 1, active);
  const anime = useDiscoverRail(mode, "anime", 1, active);
  const game = useDiscoverRail(mode, "game", 1, active && gamesEnabled);
  const candidate = useMemo(
    () =>
      getFeaturedTitle(
        gamesEnabled ? [movie, series, anime, game] : [movie, series, anime],
      ),
    [anime, game, gamesEnabled, movie, series],
  );
  useEffect(() => {
    if (candidate)
      setFeature((current) =>
        current && mediaItemKey(current) === mediaItemKey(candidate)
          ? current
          : candidate,
      );
  }, [candidate]);
  useEffect(() => {
    if (!gamesEnabled) {
      setFeature((current) =>
        current?.mediaType === "game" ? null : current,
      );
    }
  }, [gamesEnabled]);
  const railConfig = getDiscoverRailConfig(gamesEnabled);
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-7 px-5 pb-28 pt-5"
      showsVerticalScrollIndicator={false}
    >
      <DiscoverFeaturePresentation
        item={feature}
        loading={candidate === undefined}
        onPress={(item) =>
          router.push(`/title/${encodeURIComponent(createMediaRouteId(item))}`)
        }
      />
      {railConfig.map((rail) => (
        <DiscoverRail
          key={rail.mediaType}
          title={rail.title}
          mode={mode}
          mediaType={rail.mediaType}
          onSeeAll={onSeeAll}
          queryEnabled={active}
        />
      ))}
    </ScrollView>
  );
}
export function DiscoverScreen({ onSeeAll }: DiscoverScreenProps) {
  const { gamesEnabled } = useAppCapabilities();
  const pagerRef = useRef<PagerViewRef>(null);
  const [mode, setMode] = useState<DiscoveryMode>("trending");
  const [visited, setVisited] = useState<DiscoveryMode[]>(["trending"]);
  const selectMode = (next: DiscoveryMode) => {
    pagerRef.current?.setPage(modes.indexOf(next));
    setMode(next);
    setVisited((current) =>
      current.includes(next) ? current : [...current, next],
    );
  };
  return (
    <View className="flex-1">
      <View className="gap-5 px-5 pt-6">
        <Text className="font-serif text-3xl leading-9 text-archive-100">
          Find something worth your time.
        </Text>
        <DiscoverModeBar value={mode} onChange={selectMode} />
      </View>
      <PagerView
        ref={pagerRef}
        initialPage={0}
        style={{ flex: 1 }}
        onPageSelected={(event) =>
          selectMode(modes[event.nativeEvent.position]!)
        }
      >
        {modes.map((pageMode) => (
          <View key={pageMode} style={{ flex: 1 }}>
            <DiscoverModePage
              mode={pageMode}
              active={visited.includes(pageMode)}
              onSeeAll={onSeeAll}
              gamesEnabled={gamesEnabled}
            />
          </View>
        ))}
      </PagerView>
    </View>
  );
}
