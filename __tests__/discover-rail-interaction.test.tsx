import { fireEvent, render, screen } from '@testing-library/react-native';
import { DiscoverRail } from '@/features/discovery/components/DiscoverRail';
import type { NormalizedMediaItem } from '@/types/media';

const movie: NormalizedMediaItem = {
  source: 'tmdb', sourceId: 'movie:1', mediaType: 'movie', title: 'Dune', genres: [], metadata: {},
};
const another: NormalizedMediaItem = { ...movie, sourceId: 'movie:2', title: 'Arrival' };
let mockResults: NormalizedMediaItem[] = [movie, another];
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/discovery/hooks/useDiscoverRail', () => ({
  useDiscoverRail: () => ({
    data: { results: mockResults },
    isLoading: false,
    isSuccess: true,
    isError: false,
  }),
}));

describe('Discover rail interactions', () => {
  beforeEach(() => { mockResults = [movie, another]; });
  it('holds through poster press, hover and drag independently', async () => {
    const changed = jest.fn();
    await render(<DiscoverRail title="Movies" mode="trending" mediaType="movie" onInteractionChange={changed} />);
    const card = screen.getByRole('button', { name: 'Open Dune' });
    const rail = screen.getByTestId('discover-rail-trending-movie');
    await fireEvent(card, 'pressIn');
    expect(changed).toHaveBeenLastCalledWith('movie', true);
    await fireEvent(card, 'hoverIn');
    await fireEvent(card, 'pressOut');
    expect(changed).toHaveBeenLastCalledWith('movie', true);
    await fireEvent(rail, 'scrollBeginDrag');
    await fireEvent(card, 'hoverOut');
    await fireEvent(rail, 'momentumScrollBegin');
    await fireEvent(rail, 'scrollEndDrag', { nativeEvent: { velocity: { x: 0, y: 0 } } });
    expect(changed).toHaveBeenLastCalledWith('movie', true);
    await fireEvent(rail, 'momentumScrollEnd');
    expect(changed).toHaveBeenLastCalledWith('movie', false);
  });
  it('clears focus when an interacting item is removed from nonempty results', async () => {
    const changed = jest.fn();
    const view = await render(<DiscoverRail title="Movies" mode="trending" mediaType="movie" onInteractionChange={changed} />);
    await fireEvent(screen.getByRole('button', { name: 'Open Dune' }), 'focus');
    expect(changed).toHaveBeenLastCalledWith('movie', true);
    mockResults = [another];
    await view.rerender(<DiscoverRail title="Movies" mode="trending" mediaType="movie" onInteractionChange={changed} />);
    expect(changed).toHaveBeenLastCalledWith('movie', false);
  });
  it('clears its blocker when the rail becomes empty or unmounts', async () => {
    const changed = jest.fn();
    const view = await render(<DiscoverRail title="Movies" mode="trending" mediaType="movie" onInteractionChange={changed} />);
    await fireEvent(screen.getByRole('button', { name: 'Open Dune' }), 'focus');
    mockResults = [];
    await view.rerender(<DiscoverRail title="Movies" mode="trending" mediaType="movie" onInteractionChange={changed} />);
    expect(changed).toHaveBeenLastCalledWith('movie', false);
    mockResults = [movie];
    await view.rerender(<DiscoverRail title="Movies" mode="trending" mediaType="movie" onInteractionChange={changed} />);
    await fireEvent(screen.getByRole('button', { name: 'Open Dune' }), 'focus');
    await view.unmount();
    expect(changed).toHaveBeenLastCalledWith('movie', false);
  });
});
