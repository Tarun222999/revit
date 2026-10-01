import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, type NativeScrollEvent } from 'react-native';
import PagerView, { type PagerViewRef } from '@/components/ui/PagerView';
import { useAppCapabilities } from '@/features/capabilities/context/AppCapabilitiesProvider';
import { DiscoverFeaturePresentation } from '@/features/discovery/components/DiscoverFeaturePresentation';
import { DiscoverModeBar } from '@/features/discovery/components/DiscoverModeBar';
import { DiscoverRail } from '@/features/discovery/components/DiscoverRail';
import { useDiscoverRail } from '@/features/discovery/hooks/useDiscoverRail';
import { useDiscoverMotion } from '@/features/discovery/hooks/useDiscoverMotion';
import { useFeaturedRotationController } from '@/features/discovery/hooks/useFeaturedRotation';
import { getFeaturedTitles } from '@/features/discovery/model/featuredTitles';
import { createMediaRouteId } from '@/features/media/api/media-api';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';
import type { NormalizedMediaItem } from '@/types/media';

export { getFeaturedTitle } from '@/features/discovery/model/featuredTitles';

type DiscoverScreenProps = {
  onSeeAll?: (mode: DiscoveryMode, mediaType: DiscoveryMediaType) => void;
};
const modes: DiscoveryMode[] = ['trending', 'new_releases', 'top_rated'];
const baseRailConfig: Array<{ title: string; mediaType: DiscoveryMediaType }> =
  [
    { title: 'Movies', mediaType: 'movie' },
    { title: 'Series', mediaType: 'series' },
    { title: 'Anime', mediaType: 'anime' },
  ];
export function getDiscoverRailConfig(gamesEnabled: boolean) {
  return gamesEnabled
    ? [...baseRailConfig, { title: 'Games', mediaType: 'game' as const }]
    : baseRailConfig;
}

function DiscoverModePage({
  mode,
  active,
  visible,
  onSeeAll,
  gamesEnabled,
  fallback,
  onFeatureChange,
  motionSettings,
}: DiscoverScreenProps & {
  mode: DiscoveryMode;
  active: boolean;
  visible: boolean;
  gamesEnabled: boolean;
  fallback: NormalizedMediaItem | null;
  onFeatureChange: (item: NormalizedMediaItem) => void;
  motionSettings: ReturnType<typeof useDiscoverMotion>;
}) {
  const { reducedMotion, foreground, screenReader } = motionSettings;
  const [heroVisible, setHeroVisible] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [activeRails, setActiveRails] = useState<Set<DiscoveryMediaType>>(
    () => new Set(),
  );
  const onRailInteractionChange = useCallback(
    (mediaType: DiscoveryMediaType, active: boolean) => {
      setActiveRails((current) => {
        if (current.has(mediaType) === active) return current;
        const next = new Set(current);
        if (active) next.add(mediaType);
        else next.delete(mediaType);
        return next;
      });
    },
    [],
  );
  const [scrolling, setScrolling] = useState(false);
  const heroBounds = useRef({ y: 0, height: 288 });
  const viewport = useRef({ height: 0, offset: 0 });
  const updateHeroVisibility = () => {
    const hero = heroBounds.current,
      screen = viewport.current;
    const overlap = Math.max(
      0,
      Math.min(hero.y + hero.height, screen.offset + screen.height) -
        Math.max(hero.y, screen.offset),
    );
    setHeroVisible(overlap / hero.height >= 0.55);
  };
  const onScroll = (event: { nativeEvent: NativeScrollEvent }) => {
    viewport.current.offset = event.nativeEvent.contentOffset.y;
    updateHeroVisibility();
  };
  const movie = useDiscoverRail(mode, 'movie', 1, active);
  const series = useDiscoverRail(mode, 'series', 1, active);
  const anime = useDiscoverRail(mode, 'anime', 1, active);
  const game = useDiscoverRail(mode, 'game', 1, active && gamesEnabled);
  const candidates = useMemo(
    () =>
      getFeaturedTitles(
        gamesEnabled ? [movie, series, anime, game] : [movie, series, anime],
      ),
    [movie, series, anime, game, gamesEnabled],
  );
  const rotating =
    visible &&
    foreground &&
    heroVisible &&
    !reducedMotion &&
    !screenReader &&
    !interacting &&
    activeRails.size === 0 &&
    !scrolling;
  const { item: selected, settle } = useFeaturedRotationController(
    candidates,
    rotating,
  );
  const onFeatureSettled = useCallback(
    (item: NormalizedMediaItem) => {
      settle(item);
      onFeatureChange(item);
    },
    [settle, onFeatureChange],
  );
  const retained = selected ?? (candidates === undefined ? fallback : null);
  const feature =
    retained?.mediaType === 'game' && !gamesEnabled ? null : retained;
  useEffect(() => {
    if (visible && selected) onFeatureChange(selected);
  }, [visible, selected, onFeatureChange]);
  const motionEnabled =
    visible && foreground && !reducedMotion && !screenReader;
  return (
    <ScrollView
      testID={'discover-scroll-' + mode}
      className="flex-1"
      contentContainerClassName="gap-6 px-5 pb-28 pt-5"
      onLayout={(event) => {
        viewport.current.height = event.nativeEvent.layout.height;
        updateHeroVisibility();
      }}
      onScroll={onScroll}
      scrollEventThrottle={32}
      onScrollBeginDrag={() => setScrolling(true)}
      onScrollEndDrag={() => setScrolling(false)}
      onMomentumScrollBegin={() => setScrolling(true)}
      onMomentumScrollEnd={() => setScrolling(false)}
      showsVerticalScrollIndicator={false}>
      <View
        testID={'discover-hero-boundary-' + mode}
        onLayout={(event) => {
          heroBounds.current = event.nativeEvent.layout;
          updateHeroVisibility();
        }}>
        <DiscoverFeaturePresentation
          item={feature}
          gamesEnabled={gamesEnabled}
          motionEnabled={motionEnabled}
          onInteractionChange={setInteracting}
          onSettle={onFeatureSettled}
          loading={candidates === undefined}
          onPress={(item) =>
            router.push(
              `/title/${encodeURIComponent(createMediaRouteId(item))}`,
            )
          }
        />
      </View>
      {getDiscoverRailConfig(gamesEnabled).map((rail) => (
        <DiscoverRail
          key={rail.mediaType}
          title={rail.title}
          mode={mode}
          mediaType={rail.mediaType}
          onSeeAll={onSeeAll}
          queryEnabled={active}
          motionEnabled={motionEnabled}
          onInteractionChange={onRailInteractionChange}
        />
      ))}
    </ScrollView>
  );
}

export function DiscoverScreen({ onSeeAll }: DiscoverScreenProps) {
  const { gamesEnabled } = useAppCapabilities();
  const focused = useIsFocused();
  const motionSettings = useDiscoverMotion();
  const [fallback, setFallback] = useState<NormalizedMediaItem | null>(null);
  const onFeatureChange = useCallback(
    (item: NormalizedMediaItem) => setFallback(item),
    [],
  );
  const [paging, setPaging] = useState(false);
  const pagerRef = useRef<PagerViewRef>(null);
  const [mode, setMode] = useState<DiscoveryMode>('trending');
  const [visited, setVisited] = useState<DiscoveryMode[]>(['trending']);
  const updateMode = (next: DiscoveryMode) => {
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
        <DiscoverModeBar
          gamesEnabled={gamesEnabled}
          reducedMotion={motionSettings.reducedMotion}
          value={mode}
          onChange={(next) => {
            updateMode(next);
            pagerRef.current?.setPage(modes.indexOf(next));
          }}
        />
      </View>
      <PagerView
        ref={pagerRef}
        initialPage={0}
        style={{ flex: 1 }}
        onPageScrollStateChanged={(event) =>
          setPaging(event.nativeEvent.pageScrollState !== 'idle')
        }
        onPageSelected={(event) =>
          updateMode(modes[event.nativeEvent.position]!)
        }>
        {modes.map((pageMode) => (
          <View key={pageMode} style={{ flex: 1 }}>
            <DiscoverModePage
              mode={pageMode}
              active={visited.includes(pageMode)}
              visible={focused && mode === pageMode && !paging}
              onSeeAll={onSeeAll}
              gamesEnabled={gamesEnabled}
              fallback={fallback}
              onFeatureChange={onFeatureChange}
              motionSettings={motionSettings}
            />
          </View>
        ))}
      </PagerView>
    </View>
  );
}
