import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DiscoverScreen } from '@/features/discovery/components/DiscoverScreen';
import { FEATURE_INTERVAL_MS } from '@/features/discovery/hooks/useFeaturedRotation';
import type { NormalizedMediaItem } from '@/types/media';

const mockMotion = {
  foreground: true,
  reducedMotion: false,
  screenReader: false,
};
let mockFocused = true;
let mockPendingMode: string | null = null;
const mockMovie: NormalizedMediaItem = {
  source: 'tmdb',
  sourceId: 'movie:1',
  title: 'Dune',
  mediaType: 'movie',
  genres: [],
  metadata: {},
};
const mockSeries: NormalizedMediaItem = {
  ...mockMovie,
  sourceId: 'tv:2',
  title: 'Severance',
  mediaType: 'series',
};
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));
jest.mock('@/features/capabilities/context/AppCapabilitiesProvider', () => ({
  useAppCapabilities: () => ({ gamesEnabled: false }),
}));
jest.mock('@/features/discovery/hooks/useDiscoverMotion', () => ({
  useDiscoverMotion: () => mockMotion,
}));
jest.mock('@/features/discovery/hooks/useDiscoverRail', () => ({
  useDiscoverRail: (
    mode: string,
    media: string,
    _page: number,
    enabled: boolean,
  ) => ({
    data:
      !enabled || mode === mockPendingMode
        ? undefined
        : {
            results:
              media === 'movie'
                ? [mockMovie]
                : media === 'series'
                  ? [mockSeries]
                  : [],
          },
    isSuccess: enabled && mode !== mockPendingMode,
    isError: false,
    isPlaceholderData: false,
  }),
}));
jest.mock('@/components/ui/PagerView', () => {
  const React = require('react'),
    { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(
      ({ children }: { children: unknown }, ref: unknown) => {
        React.useImperativeHandle(ref, () => ({ setPage: jest.fn() }));
        return <View>{children}</View>;
      },
    ),
  };
});
jest.mock('@/features/discovery/components/DiscoverRail', () => ({
  DiscoverRail: () => null,
}));
jest.mock(
  '@/features/discovery/components/DiscoverFeaturePresentation',
  () => ({
    DiscoverFeaturePresentation: ({
      item,
      onInteractionChange,
    }: {
      item: NormalizedMediaItem | null;
      onInteractionChange: (active: boolean) => void;
    }) => {
      const { Text } = require('react-native');
      return (
        <Text
          testID="hero-title"
          onPressIn={() => onInteractionChange(true)}
          onPressOut={() => onInteractionChange(false)}>
          {item?.title ?? 'Loading'}
        </Text>
      );
    },
  }),
);

const title = (index: number) =>
  screen.getAllByTestId('hero-title')[index].props.children;
const layout = async (mode: string) => {
  await fireEvent(
    screen.getByTestId('discover-hero-boundary-' + mode),
    'layout',
    { nativeEvent: { layout: { y: 20, height: 288, width: 320, x: 0 } } },
  );
  await fireEvent(screen.getByTestId('discover-scroll-' + mode), 'layout', {
    nativeEvent: { layout: { height: 600 } },
  });
};

describe('Discover screen visibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
    mockPendingMode = null;
    Object.assign(mockMotion, {
      foreground: true,
      reducedMotion: false,
      screenReader: false,
    });
  });
  afterEach(() => jest.useRealTimers());
  it('rotates only the visible mode, retaining artwork while another mode resolves', async () => {
    await render(<DiscoverScreen />);
    await layout('trending');
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS));
    expect(title(0)).toBe('Severance');
    mockPendingMode = 'new_releases';
    await fireEvent.press(
      screen.getByRole('tab', { name: 'New Releases discovery mode' }),
    );
    await layout('new_releases');
    expect(title(1)).toBe('Severance');
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS * 2));
    expect(title(0)).toBe('Severance');
    expect(title(1)).toBe('Severance');
  });
  it('pauses offscreen and during interaction, then resumes with a fresh interval', async () => {
    await render(<DiscoverScreen />);
    await layout('trending');
    await fireEvent.scroll(screen.getByTestId('discover-scroll-trending'), {
      nativeEvent: { contentOffset: { y: 500 } },
    });
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS * 2));
    expect(title(0)).toBe('Dune');
    await fireEvent.scroll(screen.getByTestId('discover-scroll-trending'), {
      nativeEvent: { contentOffset: { y: 0 } },
    });
    await fireEvent(screen.getAllByTestId('hero-title')[0], 'pressIn');
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS * 2));
    expect(title(0)).toBe('Dune');
    await fireEvent(screen.getAllByTestId('hero-title')[0], 'pressOut');
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS - 1));
    expect(title(0)).toBe('Dune');
    await act(() => jest.advanceTimersByTime(1));
    expect(title(0)).toBe('Severance');
  });
  it('stops for route blur, background, reduced motion and screen-reader use', async () => {
    const view = await render(<DiscoverScreen />);
    await layout('trending');
    for (const reason of [
      'route',
      'foreground',
      'reducedMotion',
      'screenReader',
    ]) {
      mockFocused = reason !== 'route';
      Object.assign(mockMotion, {
        foreground: reason !== 'foreground',
        reducedMotion: reason === 'reducedMotion',
        screenReader: reason === 'screenReader',
      });
      await view.rerender(<DiscoverScreen />);
      await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS * 2));
      expect(title(0)).toBe('Dune');
    }
  });
});
