import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccessibilityInfo, Animated } from 'react-native';

import { useAppCapabilities } from '@/features/capabilities/context/AppCapabilitiesProvider';
import {
  getWelcomeMediaChapters,
  getWelcomeHeroMinHeight,
  getNextWelcomeMediaIndex,
  getRenderedWelcomeMediaIndex,
  GoogleSignInButton,
  GoogleSignInError,
  HeroArtwork,
  isWelcomePageVisible,
  shouldAutoplayWelcomeMedia,
  WELCOME_ROTATION_MS,
  WelcomeAuthScreen,
} from '@/features/auth/components/WelcomeAuthScreen';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@/features/capabilities/context/AppCapabilitiesProvider', () => ({
  useAppCapabilities: jest.fn(),
}));

const mockCapabilities = jest.mocked(useAppCapabilities);
const mockRouterPush = jest.mocked(router.push);

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, right: 0, bottom: 34, left: 0 },
};

async function renderWelcome() {
  return await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <WelcomeAuthScreen />
    </SafeAreaProvider>,
  );
}

function getHeroOpacity(testId: string) {
  const opacity = screen.getByTestId(testId, {
    includeHiddenElements: true,
  }).props.style.opacity as number | { __getValue: () => number };

  return typeof opacity === 'number' ? opacity : opacity.__getValue();
}

function setGamesCapability(gamesEnabled: boolean) {
  mockCapabilities.mockReturnValue({
    gamesEnabled,
    isRefreshing: false,
    isResolved: gamesEnabled,
    refresh: jest.fn(),
  });
}

describe('WelcomeAuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    setGamesCapability(false);
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('uses the approved cinematic hierarchy with Google as the only provider action', async () => {
    await renderWelcome();

    expect(screen.getByText('Revit')).toBeTruthy();
    expect(screen.queryByText('Private by default')).toBeNull();
    expect(screen.queryByText('Your entertainment journal')).toBeNull();
    expect(screen.queryByText('Start your private journal')).toBeNull();
    expect(screen.getByText(/Every story. Every world./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(screen.queryByText('Continue with Apple')).toBeNull();
    expect(screen.queryByText('Continue with Email')).toBeNull();
  });

  it('fails closed to Movies, Series, and Anime while the Games capability is disabled or unresolved', async () => {
    await renderWelcome();

    expect(screen.getByLabelText('Media types: Movies, Series, Anime')).toBeTruthy();
    expect(screen.queryByLabelText(/Media types: .*Games/)).toBeNull();
    expect(screen.queryByText(/Watch · Remember/)).toBeNull();
  });

  it('adds Games artwork and taxonomy only when enabled', async () => {
    setGamesCapability(true);
    await renderWelcome();

    expect(getWelcomeMediaChapters(true)[2].image).toEqual(
      require('@/assets/images/animie-ippo.jpg'),
    );
    expect(getWelcomeMediaChapters(true)[3].image).toEqual(
      require('@/assets/images/game-gta.jpg'),
    );
    expect(screen.getByLabelText('Media types: Movies, Series, Anime, Games')).toBeTruthy();
    expect(screen.getByTestId('welcome-hero-image-games', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/Games · Play · Complete/)).toBeNull();
  });

  it('keeps automatic rotation paused for hover, reduced motion, and hidden pages', () => {
    expect(
      shouldAutoplayWelcomeMedia({
        isHovered: true,
        isPageVisible: true,
        reducedMotion: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoplayWelcomeMedia({
        isHovered: false,
        isPageVisible: true,
        reducedMotion: true,
      }),
    ).toBe(false);
    expect(
      shouldAutoplayWelcomeMedia({
        isHovered: false,
        isPageVisible: false,
        reducedMotion: false,
      }),
    ).toBe(false);
  });

  it('treats a hidden browser document as not visible before rotation begins', () => {
    expect(isWelcomePageVisible({ appState: 'active', isDocumentHidden: true })).toBe(false);
    expect(isWelcomePageVisible({ appState: 'background', isDocumentHidden: false })).toBe(false);
    expect(isWelcomePageVisible({ appState: 'active', isDocumentHidden: false })).toBe(true);
    expect(isWelcomePageVisible({ appState: null, isDocumentHidden: false })).toBe(true);
  });

  it('gives the stationary foreground additional room for large text', () => {
    expect(getWelcomeHeroMinHeight(844, 1)).toBe(523);
    expect(getWelcomeHeroMinHeight(844, 2)).toBe(703);
  });

  it('normalizes an active Games chapter synchronously when Games becomes unavailable', async () => {
    jest.useFakeTimers();
    setGamesCapability(true);
    const rendered = await renderWelcome();

    await act(async () => {
      await Promise.resolve();
    });
    for (let index = 0; index < 3; index += 1) {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(WELCOME_ROTATION_MS);
      });
    }
    expect(
      screen.getByTestId('welcome-hero-layer-games', { includeHiddenElements: true }).props
        .accessibilityState,
    ).toEqual({ selected: true });

    setGamesCapability(false);
    await act(async () => {
      rendered.rerender(
        <SafeAreaProvider initialMetrics={safeAreaMetrics}>
          <WelcomeAuthScreen />
        </SafeAreaProvider>,
      );
    });

    expect(screen.getByLabelText('Media types: Movies, Series, Anime')).toBeTruthy();
    expect(getHeroOpacity('welcome-hero-layer-movies')).toBe(1);
    expect(
      screen.getByTestId('welcome-hero-layer-movies', { includeHiddenElements: true }).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.queryByTestId('welcome-hero-layer-games', { includeHiddenElements: true })).toBeNull();
  });

  it('sets hero opacity directly instead of animating when reduced motion is enabled', async () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    const movieChapter = getWelcomeMediaChapters(false)[0];
    const rendered = await render(
      <HeroArtwork chapter={movieChapter} isActive reducedMotion />,
    );

    expect(getHeroOpacity('welcome-hero-layer-movies')).toBe(1);
    expect(timingSpy).not.toHaveBeenCalled();

    await rendered.rerender(
      <HeroArtwork chapter={movieChapter} isActive={false} reducedMotion />,
    );

    expect(getHeroOpacity('welcome-hero-layer-movies')).toBe(0);
    expect(timingSpy).not.toHaveBeenCalled();
  });

  it('uses a stable branded fallback if a hero image fails', async () => {
    await renderWelcome();

    fireEvent(screen.getByTestId('welcome-hero-image-movies', { includeHiddenElements: true }), 'error', {
      nativeEvent: { error: 'Unable to load artwork.' },
    });

    expect(
      await screen.findByTestId('welcome-hero-fallback-movies', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByText('Revit')).toBeTruthy();
  });

  it('makes the Google action visibly disabled while opening the provider', async () => {
    await render(<GoogleSignInButton loading onPress={jest.fn()} />);

    expect(screen.getByText('Opening Google…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Google' }).props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('renders calm retryable Google error feedback', async () => {
    await render(<GoogleSignInError error="Connection failed. Try again." />);

    expect(screen.getByText('Connection failed. Try again.')).toBeTruthy();
  });

  it('keeps legal navigation available', async () => {
    await renderWelcome();

    await fireEvent.press(screen.getByRole('link', { name: 'Terms' }));
    await fireEvent.press(screen.getByRole('link', { name: 'Privacy Policy' }));

    expect(mockRouterPush).toHaveBeenCalledWith('/legal/terms');
    expect(mockRouterPush).toHaveBeenCalledWith('/legal/privacy');
  });

});

describe('welcome media chapter contract', () => {
  it('returns exactly the three fail-closed chapters or all four enabled chapters', () => {
    expect(getWelcomeMediaChapters(false).map((chapter) => chapter.id)).toEqual([
      'movies',
      'series',
      'anime',
    ]);
    expect(getWelcomeMediaChapters(true).map((chapter) => chapter.id)).toEqual([
      'movies',
      'series',
      'anime',
      'games',
    ]);
  });

  it('cycles through each enabled chapter at the 5.6-second rotation boundary', () => {
    expect(WELCOME_ROTATION_MS).toBe(5_600);
    expect(getNextWelcomeMediaIndex(0, 4)).toBe(1);
    expect(getNextWelcomeMediaIndex(2, 4)).toBe(3);
    expect(getNextWelcomeMediaIndex(3, 4)).toBe(0);
    expect(getNextWelcomeMediaIndex(2, 3)).toBe(0);
  });

  it('fails an out-of-range rendered chapter index closed to Movies', () => {
    expect(getRenderedWelcomeMediaIndex(3, 4)).toBe(3);
    expect(getRenderedWelcomeMediaIndex(3, 3)).toBe(0);
    expect(getRenderedWelcomeMediaIndex(-1, 3)).toBe(0);
  });
});
