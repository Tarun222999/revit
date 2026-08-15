import { fireEvent, render, screen } from '@testing-library/react-native';

import { DiscoverFeaturePresentation } from '@/features/discovery/components/DiscoverFeaturePresentation';
import { DiscoverModeBar } from '@/features/discovery/components/DiscoverModeBar';
import { DiscoverPosterCard } from '@/features/discovery/components/DiscoverPosterCard';
import { getFeaturedTitle } from '@/features/discovery/components/DiscoverScreen';
import type { NormalizedMediaItem } from '@/types/media';

const movie = {
  description: 'A desert epic.',
  genres: ['Science Fiction'],
  imageUrl: 'https://example.com/dune.jpg',
  mediaType: 'movie',
  metadata: {},
  source: 'tmdb',
  sourceId: 'movie:1',
  title: 'Dune',
  year: '2024',
} satisfies NormalizedMediaItem;

const series = {
  ...movie,
  mediaType: 'series',
  sourceId: 'tv:2',
  title: 'Severance',
} satisfies NormalizedMediaItem;

function makeFeatureQuery({
  error = false,
  loading = false,
  placeholder = false,
  results = [],
}: {
  error?: boolean;
  loading?: boolean;
  placeholder?: boolean;
  results?: NormalizedMediaItem[];
}) {
  return {
    data: { page: 1, results, totalPages: 1 },
    isError: error,
    isPlaceholderData: placeholder,
    isSuccess: !error && !loading,
  } as unknown as ReturnType<typeof import('@/features/discovery/hooks/useDiscoverRail').useDiscoverRail>;
}

describe('Discover feature selection', () => {
  it('uses the first valid movie before lower-priority media', () => {
    expect(
      getFeaturedTitle([
        makeFeatureQuery({ results: [movie] }),
        makeFeatureQuery({ results: [series] }),
        makeFeatureQuery({}),
      ]),
    ).toEqual(movie);
  });

  it('waits for movies before using a series fallback', () => {
    expect(
      getFeaturedTitle([
        makeFeatureQuery({ loading: true }),
        makeFeatureQuery({ results: [series] }),
        makeFeatureQuery({}),
      ]),
    ).toBeUndefined();
  });

  it('falls back after a higher-priority rail settles without a usable title', () => {
    expect(
      getFeaturedTitle([
        makeFeatureQuery({ results: [] }),
        makeFeatureQuery({ results: [series] }),
        makeFeatureQuery({}),
      ]),
    ).toEqual(series);
  });
});

describe('Discover interactions', () => {
  it('exposes discovery modes as tabs and reports changes', async () => {
    const onChange = jest.fn();

    await render(<DiscoverModeBar value="trending" onChange={onChange} />);

    const trending = screen.getByRole('tab', { name: 'Trending discovery mode' });
    expect(trending.props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(
      screen.getByRole('tab', { name: 'Top Rated discovery mode' }),
    );

    expect(onChange).toHaveBeenCalledWith('top_rated');
  });

  it('opens the selected feature through one accessible control', async () => {
    const onPress = jest.fn();

    await render(
      <DiscoverFeaturePresentation item={movie} loading={false} onPress={onPress} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Open Dune' }));

    expect(onPress).toHaveBeenCalledWith(movie);
  });

  it('uses shelf context instead of repeating the media type on rail cards', async () => {
    await render(<DiscoverPosterCard item={movie} onPress={jest.fn()} />);

    expect(screen.queryByText('Movie')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open Dune' })).toBeTruthy();
  });
});
