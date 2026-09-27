import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react-native';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { cancelAnimation, withTiming } from 'react-native-reanimated';
import { DiscoverFeaturePresentation } from '@/features/discovery/components/DiscoverFeaturePresentation';
import { useDiscoverMotion } from '@/features/discovery/hooks/useDiscoverMotion';
import {
  FEATURE_INTERVAL_MS,
  useFeaturedRotation,
} from '@/features/discovery/hooks/useFeaturedRotation';
import { getFeaturedTitles } from '@/features/discovery/model/featuredTitles';
import type { NormalizedMediaItem } from '@/types/media';

jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    useSharedValue: (value: number) =>
      require('react').useRef({ value }).current,
    // Keep the outgoing layer visible until the test completes or interrupts it.
    withTiming: jest.fn(() => 1),
    cancelAnimation: jest.fn(),
    runOnJS: (fn: unknown) => fn,
  };
});

const movie: NormalizedMediaItem = {
  source: 'tmdb',
  sourceId: 'movie:1',
  mediaType: 'movie',
  title: 'Dune',
  genres: [],
  metadata: {},
};
const series: NormalizedMediaItem = {
  ...movie,
  sourceId: 'tv:2',
  mediaType: 'series',
  title: 'Severance',
};
const game: NormalizedMediaItem = {
  ...movie,
  source: 'igdb',
  sourceId: '3',
  mediaType: 'game',
  title: 'Hades',
};
const rail = (
  results: NormalizedMediaItem[],
  pending = false,
  placeholder = false,
) => ({
  data: { results },
  isSuccess: !pending,
  isError: false,
  isPlaceholderData: placeholder,
});

describe('loaded feature program', () => {
  it('skips pending, placeholder and invalid titles without hiding ready media', () => {
    expect(
      getFeaturedTitles([
        rail([], true),
        rail([series]),
        rail([{ ...movie, title: ' ' }]),
        rail([game], false, true),
      ]),
    ).toEqual([series]);
  });
  it('preserves priority, deduplicates and excludes games when its rail is absent', () => {
    expect(
      getFeaturedTitles([
        rail([movie]),
        rail([series]),
        rail([movie]),
        rail([game]),
      ]),
    ).toEqual([movie, series, game]);
    expect(getFeaturedTitles([rail([movie]), rail([series])])).toEqual([
      movie,
      series,
    ]);
  });
  it('distinguishes pending and settled empty programs', () => {
    expect(getFeaturedTitles([rail([], true)])).toBeUndefined();
    expect(getFeaturedTitles([rail([])])).toEqual([]);
  });
});

describe('rotation lifecycle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it('cycles in order and starts a fresh interval after every pause', async () => {
    const hook = await renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useFeaturedRotation([movie, series], enabled),
      { initialProps: { enabled: true } },
    );
    expect(hook.result.current).toEqual(movie);
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS));
    expect(hook.result.current).toEqual(series);
    await hook.rerender({ enabled: false });
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS * 3));
    expect(hook.result.current).toEqual(series);
    await hook.rerender({ enabled: true });
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS - 1));
    expect(hook.result.current).toEqual(series);
    await act(() => jest.advanceTimersByTime(1));
    expect(hook.result.current).toEqual(movie);
    const cancelled = jest.spyOn(globalThis, 'clearTimeout');
    await hook.unmount();
    expect(cancelled).toHaveBeenCalled();
    cancelled.mockRestore();
  });
  it('handles refreshed metadata, removed candidates, pending data and empty results', async () => {
    const hook = await renderHook(
      ({ items }: { items: NormalizedMediaItem[] | undefined }) =>
        useFeaturedRotation(items, true),
      {
        initialProps: {
          items: [movie, game] as NormalizedMediaItem[] | undefined,
        },
      },
    );
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS));
    expect(hook.result.current).toEqual(game);
    await hook.rerender({ items: [movie] });
    expect(hook.result.current).toEqual(movie);
    await act(() => jest.advanceTimersByTime(FEATURE_INTERVAL_MS * 2));
    expect(hook.result.current).toEqual(movie);
    await hook.rerender({ items: [{ ...movie, title: 'Updated metadata' }] });
    expect(hook.result.current?.title).toBe('Updated metadata');
    await hook.rerender({ items: undefined });
    expect(hook.result.current?.title).toBe('Updated metadata');
    await hook.rerender({ items: [] });
    expect(hook.result.current).toBeNull();
  });
  it('does not reset a live interval on same-identity metadata refreshes', async () => {
    const hook = await renderHook(
      ({ items }: { items: NormalizedMediaItem[] | undefined }) =>
        useFeaturedRotation(items, true),
      { initialProps: { items: [movie, series] } },
    );
    await act(() => jest.advanceTimersByTime(6000));
    await hook.rerender({
      items: [{ ...movie, description: 'Refreshed' }, series],
    });
    await act(() => jest.advanceTimersByTime(500));
    expect(hook.result.current).toEqual(series);
  });
});

describe('hero activation and cancellation', () => {
  it('opens the dominant outgoing title during an interrupted dissolve in one action', async () => {
    const open = jest.fn();
    const view = await render(
      <DiscoverFeaturePresentation
        item={movie}
        loading={false}
        motionEnabled
        onPress={open}
      />,
    );
    await view.rerender(
      <DiscoverFeaturePresentation
        item={series}
        loading={false}
        motionEnabled
        onPress={open}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button'));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(movie);
    expect(screen.getByRole('button', { name: 'Open Dune' })).toBeTruthy();
  });
  it('ignores completion from a superseded transition and disables motion immediately', async () => {
    const view = await render(
      <DiscoverFeaturePresentation
        item={movie}
        loading={false}
        motionEnabled
      />,
    );
    await view.rerender(
      <DiscoverFeaturePresentation
        item={series}
        loading={false}
        motionEnabled
      />,
    );
    const complete = jest.mocked(withTiming).mock.calls.at(-1)?.[2];
    await view.rerender(
      <DiscoverFeaturePresentation
        item={game}
        loading={false}
        motionEnabled={false}
      />,
    );
    await act(() => complete?.(true));
    expect(screen.getByRole('button', { name: 'Open Hades' })).toBeTruthy();
    expect(
      screen.queryByText('Severance', { includeHiddenElements: true }),
    ).toBeNull();
    await view.unmount();
    expect(cancelAnimation).toHaveBeenCalled();
  });
  it('reports focus and hover independently and keeps reduced motion static', async () => {
    const changed = jest.fn();
    await render(
      <DiscoverFeaturePresentation
        item={movie}
        loading={false}
        onInteractionChange={changed}
      />,
    );
    const hero = screen.getByRole('button');
    await fireEvent(hero, 'focus');
    await fireEvent(hero, 'hoverIn');
    await fireEvent(hero, 'blur');
    expect(changed).toHaveBeenLastCalledWith(true);
    await fireEvent(hero, 'hoverOut');
    expect(changed).toHaveBeenLastCalledWith(false);
  });
});

describe('system motion preferences', () => {
  it('reacts to reduced motion, screen reader and app focus changes and removes listeners', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const access = new Map<string, (value: boolean) => void>();
    const app = new Map<string, (value: string) => void>();
    const remove = jest.fn();
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((name, listener) => {
        access.set(name, listener as unknown as (value: boolean) => void);
        return { remove } as unknown as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((name, listener) => {
        app.set(name, listener as (value: string) => void);
        return { remove };
      });
    AppState.currentState = 'active';
    const hook = await renderHook(useDiscoverMotion);
    expect(hook.result.current).toEqual({
      reducedMotion: false,
      foreground: true,
      screenReader: false,
    });
    await act(() => access.get('reduceMotionChanged')?.(true));
    expect(hook.result.current.reducedMotion).toBe(true);
    await act(() => access.get('screenReaderChanged')?.(true));
    expect(hook.result.current.screenReader).toBe(true);
    await act(() => app.get('change')?.('background'));
    expect(hook.result.current.foreground).toBe(false);
    await act(() => app.get('change')?.('active'));
    expect(hook.result.current.foreground).toBe(true);
    await act(() => app.get('blur')?.(''));
    expect(hook.result.current.foreground).toBe(false);
    await hook.unmount();
    expect(remove).toHaveBeenCalledTimes(5);
    jest.restoreAllMocks();
  });
});
