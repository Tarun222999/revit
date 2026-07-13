import { dedupeMediaItems, mediaItemKey } from '../features/discovery/utils/dedupeMediaItems';
import {
  formatTitleMetadataLine,
  getTitleDetailMetrics,
} from '../features/media/model/titleDetails';
import type { NormalizedMediaItem } from '../types/media';

function makeMediaItem(
  overrides: Partial<NormalizedMediaItem> = {},
): NormalizedMediaItem {
  return {
    source: 'tmdb',
    sourceId: '1',
    mediaType: 'movie',
    title: 'Example Movie',
    originalTitle: null,
    description: null,
    releaseDate: '2025-04-20',
    year: '2025',
    imageUrl: null,
    backdropUrl: null,
    genres: ['Drama', 'Mystery', 'Thriller'],
    metadata: {},
    ...overrides,
  };
}

describe('media helpers', () => {
  it('builds stable keys and removes duplicate provider records', () => {
    const first = makeMediaItem({ sourceId: '1', title: 'First result' });
    const duplicate = makeMediaItem({ sourceId: '1', title: 'Duplicate result' });
    const differentSource = makeMediaItem({ source: 'igdb', sourceId: '1' });

    expect(mediaItemKey(first)).toBe('tmdb:1');
    expect(dedupeMediaItems([first, duplicate, differentSource])).toEqual([
      first,
      differentSource,
    ]);
  });

  it('formats the title metadata line with at most two genres', () => {
    expect(formatTitleMetadataLine(makeMediaItem())).toBe(
      'Movie - 2025 - Drama - Mystery',
    );
  });

  it('formats title detail metrics from normalized metadata', () => {
    const metrics = getTitleDetailMetrics(
      makeMediaItem({
        metadata: {
          episodeRuntime: [45],
          language: 'ignored',
          networks: ['HBO'],
          originalLanguage: 'en',
          productionCompanies: ['Example Studio'],
          seasonCount: 2,
          runtime: 125,
        },
      }),
    );

    expect(metrics).toEqual(
      expect.arrayContaining([
        { label: 'Language', value: 'EN' },
        { label: 'Network', value: 'HBO' },
        { label: 'Runtime', value: '2h 5m' },
        { label: 'Seasons', value: '2' },
        { label: 'Studio', value: 'Example Studio' },
      ]),
    );
  });

  it('omits invalid or empty title metrics', () => {
    expect(
      getTitleDetailMetrics(
        makeMediaItem({
          metadata: {
            networks: [42],
            runtime: 0,
            seasonCount: 0,
          },
          releaseDate: null,
        }),
      ),
    ).toEqual([]);
  });
});
