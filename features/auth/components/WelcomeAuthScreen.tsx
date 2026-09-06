import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Screen } from '@/components/ui/Screen';
import { signInWithGoogle } from '@/features/auth/api/google-auth-api';
import { useAppCapabilities } from '@/features/capabilities/context/AppCapabilitiesProvider';
import { cn } from '@/lib/utils/cn';

export const WELCOME_ROTATION_MS = 5_600;
const HERO_CROSSFADE_MS = 900;

type MediaChapterId = 'movies' | 'series' | 'anime' | 'games';

type MediaChapter = {
  id: MediaChapterId;
  image: ImageSource;
  imageScale?: number;
  label: string;
};

const mediaChapters: Record<MediaChapterId, MediaChapter> = {
  movies: {
    id: 'movies',
    image: require('@/assets/images/movie-heat.jpg'),
    imageScale: 1.04,
    label: 'Movies',
  },
  series: {
    id: 'series',
    image: require('@/assets/images/series-bear.jpg'),
    imageScale: 1.04,
    label: 'Series',
  },
  anime: {
    id: 'anime',
    image: require('@/assets/images/animie-ippo.jpg'),
    imageScale: 1.04,
    label: 'Anime',
  },
  games: {
    id: 'games',
    image: require('@/assets/images/game-gta.jpg'),
    imageScale: 1.04,
    label: 'Games',
  },
};

export function getWelcomeMediaChapters(gamesEnabled: boolean) {
  const ids: MediaChapterId[] = gamesEnabled
    ? ['movies', 'series', 'anime', 'games']
    : ['movies', 'series', 'anime'];

  return ids.map((id) => mediaChapters[id]);
}

export function shouldAutoplayWelcomeMedia({
  isHovered,
  isPageVisible,
  reducedMotion,
}: {
  isHovered: boolean;
  isPageVisible: boolean;
  reducedMotion: boolean;
}) {
  return !isHovered && isPageVisible && !reducedMotion;
}

export function isWelcomePageVisible({
  appState,
  isDocumentHidden,
}: {
  appState: AppStateStatus | null;
  isDocumentHidden: boolean;
}) {
  return appState !== 'background' && appState !== 'inactive' && !isDocumentHidden;
}

export function getNextWelcomeMediaIndex(currentIndex: number, chapterCount: number) {
  return (currentIndex + 1) % chapterCount;
}

export function getRenderedWelcomeMediaIndex(activeIndex: number, chapterCount: number) {
  return activeIndex >= 0 && activeIndex < chapterCount ? activeIndex : 0;
}

export function getWelcomeHeroMinHeight(height: number, fontScale: number) {
  const baseHeight = Math.min(Math.max(height * 0.62, 500), 650);
  const largeTextAllowance = Math.max(fontScale - 1, 0) * 180;

  return Math.round(baseHeight + largeTextAllowance);
}

export function HeroArtwork({
  chapter,
  forceImmediate = false,
  isActive,
  reducedMotion,
}: {
  chapter: MediaChapter;
  forceImmediate?: boolean;
  isActive: boolean;
  reducedMotion: boolean;
}) {
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    opacity.stopAnimation();

    if (reducedMotion || forceImmediate) {
      opacity.setValue(isActive ? 1 : 0);
      return;
    }

    const animation = Animated.timing(opacity, {
      duration: HERO_CROSSFADE_MS,
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [forceImmediate, isActive, opacity, reducedMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      accessibilityState={{ selected: isActive }}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      testID={`welcome-hero-layer-${chapter.id}`}
      style={{ opacity, position: 'absolute', inset: 0 }}>
      {failed ? (
        <View
          testID={`welcome-hero-fallback-${chapter.id}`}
          className="h-full w-full items-center justify-center bg-archive-800">
          <Ionicons color="#d7a94d" name="book-outline" size={72} />
          <Text className="mt-4 text-sm font-bold uppercase tracking-[4px] text-gold-300">
            Revit
          </Text>
        </View>
      ) : (
        <Image
          testID={`welcome-hero-image-${chapter.id}`}
          accessibilityLabel=""
          contentFit="cover"
          onError={() => setFailed(true)}
          source={chapter.image}
          style={{
            height: '100%',
            transform: [{ scale: chapter.imageScale ?? 1 }],
            width: '100%',
          }}
        />
      )}
    </Animated.View>
  );
}

export function GoogleSignInButton({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      accessibilityRole="button"
      accessibilityState={{ disabled: loading }}
      className={cn(
        'min-h-14 flex-row items-center justify-center gap-3 rounded-app border border-gold-300 bg-gold-400 px-5',
        loading && 'opacity-65',
      )}
      disabled={loading}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator color="#30220e" />
      ) : (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-archive-50">
          <Ionicons color="#4285f4" name="logo-google" size={17} />
        </View>
      )}
      <Text className="text-base font-extrabold text-shelf-700">
        {loading ? 'Opening Google…' : 'Continue with Google'}
      </Text>
    </Pressable>
  );
}

export function GoogleSignInError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <View accessibilityRole="alert" className="border-l-2 border-reel-400 bg-reel-400/10 px-3 py-3">
      <Text className="text-sm leading-5 text-reel-300">{error}</Text>
    </View>
  );
}

export function WelcomeAuthScreen() {
  const { gamesEnabled } = useAppCapabilities();
  const chapters = useMemo(() => getWelcomeMediaChapters(gamesEnabled), [gamesEnabled]);
  const { fontScale, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() =>
    isWelcomePageVisible({
      appState: AppState.currentState,
      isDocumentHidden: Platform.OS === 'web' && typeof document !== 'undefined' && document.hidden,
    }),
  );
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const renderedActiveIndex = getRenderedWelcomeMediaIndex(activeIndex, chapters.length);
  const shouldShowActiveImmediately = activeIndex !== renderedActiveIndex;
  const autoplay = shouldAutoplayWelcomeMedia({
    isHovered,
    isPageVisible,
    reducedMotion,
  });
  const heroMinHeight = getWelcomeHeroMinHeight(height, fontScale);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {
      setReducedMotion(false);
    });

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      setIsPageVisible(
        isWelcomePageVisible({
          appState: nextState,
          isDocumentHidden: Platform.OS === 'web' && typeof document !== 'undefined' && document.hidden,
        }),
      );
    });

    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return () => appStateSubscription.remove();
    }

    const onVisibilityChange = () =>
      setIsPageVisible(
        isWelcomePageVisible({
          appState: AppState.currentState,
          isDocumentHidden: document.hidden,
        }),
      );
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      appStateSubscription.remove();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeIndex !== renderedActiveIndex) {
      setActiveIndex(renderedActiveIndex);
    }
  }, [activeIndex, renderedActiveIndex]);

  useEffect(() => {
    if (!autoplay) {
      return;
    }

    const rotationTimer = setInterval(() => {
      setActiveIndex((currentIndex) => getNextWelcomeMediaIndex(currentIndex, chapters.length));
    }, WELCOME_ROTATION_MS);

    return () => clearInterval(rotationTimer);
  }, [autoplay, chapters.length]);

  async function handleGoogleSignIn() {
    setError(null);
    setLoadingGoogle(true);

    try {
      const callbackUrl = await signInWithGoogle();

      if (!callbackUrl) {
        return;
      }

      const parsedUrl = Linking.parse(callbackUrl);
      const code = parsedUrl.queryParams?.code;
      const errorDescription = parsedUrl.queryParams?.error_description;

      if (typeof code !== 'string' && typeof errorDescription !== 'string') {
        throw new Error('Google sign-in did not return an auth code.');
      }

      router.replace({
        pathname: '/(auth)/callback',
        params: {
          ...(typeof code === 'string' ? { code } : {}),
          ...(typeof errorDescription === 'string'
            ? { error_description: errorDescription }
            : {}),
        },
      });
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in failed.');
    } finally {
      setLoadingGoogle(false);
    }
  }

  return (
    <Screen padded={false} safeAreaEdges={['right', 'bottom', 'left']}>
      <ScrollView
        automaticallyAdjustContentInsets={false}
        contentContainerClassName="flex-grow items-center bg-archive-900"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}>
        <View className="w-full flex-1 self-center bg-archive-900" style={{ maxWidth: 620 }}>
          <Pressable
            accessible={false}
            className="relative flex-1 overflow-hidden bg-archive-800"
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            testID="welcome-hero-stage"
            style={{ minHeight: heroMinHeight }}>
            {chapters.map((chapter, index) => (
              <HeroArtwork
                chapter={chapter}
                forceImmediate={shouldShowActiveImmediately}
                isActive={index === renderedActiveIndex}
                key={chapter.id}
                reducedMotion={reducedMotion}
              />
            ))}
            <View className="absolute inset-0 bg-archive-900/30" />
            <View className="absolute inset-x-0 top-0 h-36 bg-archive-900/40" />
            <View className="absolute inset-x-0 bottom-0 h-64 bg-archive-900/30" />
            <View className="absolute inset-x-0 bottom-0 h-44 bg-archive-900/50" />
            <View className="absolute inset-x-0 bottom-0 h-28 bg-archive-900/70" />
            <View className="absolute inset-x-0 bottom-0 h-14 bg-archive-900" />

            <View className="flex-1 px-6 pb-5 pt-14">
              <View
                className="max-w-full min-w-0 flex-row items-center gap-3"
                testID="welcome-brand-header">
                <View className="h-9 w-9 flex-shrink-0 items-center justify-center rounded-app border border-gold-300/70 bg-archive-900/70">
                  <Ionicons color="#edcd88" name="book-outline" size={21} />
                </View>
                <Text className="min-w-0 flex-shrink font-serif text-3xl font-bold text-archive-50">
                  Revit
                </Text>
              </View>

              <View className="mt-auto max-w-[430px] gap-3">
                <Text className="font-serif text-5xl leading-[48px] text-archive-50">
                  Every story. Every world. <Text className="text-gold-300">One journal.</Text>
                </Text>
                <Text className="max-w-[380px] text-base leading-6 text-archive-100">
                  Plan what is next, log what you finish, and keep the moments that stayed with you.
                </Text>
                <Text
                  accessibilityLabel={`Media types: ${chapters.map((chapter) => chapter.label).join(', ')}`}
                  className="pt-1 font-serif text-sm text-archive-200">
                  {chapters.map((chapter) => chapter.label).join(' · ')}
                </Text>
              </View>
            </View>
          </Pressable>

          <View className="gap-3 bg-archive-900 px-6 pb-5 pt-1">
            <GoogleSignInButton loading={loadingGoogle} onPress={handleGoogleSignIn} />

            <GoogleSignInError error={error} />

            <Text className="text-center text-xs leading-5 text-archive-200">
              By continuing, you agree to Revit&apos;s{' '}
              <Text
                accessibilityRole="link"
                className="font-semibold text-gold-200"
                onPress={() => router.push('/legal/terms')}>
                Terms
              </Text>{' '}
              and{' '}
              <Text
                accessibilityRole="link"
                className="font-semibold text-gold-200"
                onPress={() => router.push('/legal/privacy')}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
