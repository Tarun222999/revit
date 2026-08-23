import { normalizeIgdbGame, normalizeIgdbImageUrl } from '../supabase/functions/_shared/igdb-normalizer';
import type { IgdbGame } from '../supabase/functions/_shared/igdb-types';
import type { NormalizedMediaItem } from '@/types/media';

const fixture: IgdbGame = {
  id: 1942,
  name: 'Hades',
  slug: 'hades',
  summary: 'Defy the god of the dead.',
  first_release_date: 1596153600,
  cover: {
    image_id: 'co2lbd',
    url: '//images.igdb.com/igdb/image/upload/t_thumb/co2lbd.jpg',
  },
  artworks: [
    {
      image_id: 'ar1',
      url: 'https://images.igdb.com/igdb/image/upload/t_720p/ar1.jpg',
    },
  ],
  genres: [{ id: 31, name: 'Adventure' }, { id: 12, name: 'Role-playing (RPG)' }],
  platforms: [
    { id: 6, name: 'PC (Microsoft Windows)', abbreviation: 'PC' },
    { id: 48, name: 'PlayStation 4' },
  ],
  rating: 84.2,
  aggregated_rating: 93,
  total_rating: 88.6,
  rating_count: 1000,
  aggregated_rating_count: 20,
  popularity: 72.1,
  age_ratings: [
    {
      id: 10,
      organization: { id: 1, name: 'ESRB' },
      rating_category: { id: 6, rating: 'Teen' },
      rating_content_descriptions: [{ id: 22, description: 'Violence' }],
    },
  ],
};

describe('normalizeIgdbGame', () => {
  it('maps a representative game fixture to the canonical media shape', () => {
    const normalized: NormalizedMediaItem | null = normalizeIgdbGame(fixture);

    expect(normalized).toEqual({
      source: 'igdb',
      sourceId: '1942',
      mediaType: 'game',
      title: 'Hades',
      originalTitle: null,
      description: 'Defy the god of the dead.',
      releaseDate: '2020-07-31',
      year: '2020',
      imageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.jpg',
      backdropUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/ar1.jpg',
      genres: ['Adventure', 'Role-playing (RPG)'],
      metadata: {
        igdbId: 1942,
        igdbSlug: 'hades',
        rating: 84.2,
        aggregatedRating: 93,
        totalRating: 88.6,
        ratingCount: 1000,
        aggregatedRatingCount: 20,
        popularity: 72.1,
        platforms: ['PC (Microsoft Windows)', 'PlayStation 4'],
        ageRatings: [
          {
            id: 10,
            organization: { id: 1, name: 'ESRB' },
            ratingCategory: { id: 6, rating: 'Teen' },
            contentDescriptions: ['Violence'],
          },
        ],
      },
    });
  });

  it('is deterministic for sparse and malformed optional fields', () => {
    expect(
      normalizeIgdbGame({
        id: 7,
        name: '  ',
        first_release_date: 'not-a-date',
        cover: { url: 'javascript:bad', image_id: 'safe-id' },
        artworks: [{ url: 'https://example.com/not-igdb.jpg' }],
        genres: [{ name: 'Puzzle' }, { name: 'Puzzle' }, { name: 42 as unknown as string }],
        platforms: [null as never, { name: 'PC' }, { name: 'PC' }],
        age_ratings: [null as never, { rating: 'bad' as never }],
        rating: Number.NaN,
      }),
    ).toEqual({
      source: 'igdb',
      sourceId: '7',
      mediaType: 'game',
      title: 'Untitled game',
      originalTitle: null,
      description: null,
      releaseDate: null,
      year: null,
      imageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/safe-id.jpg',
      backdropUrl: 'https://images.igdb.com/igdb/image/upload/t_1080p/safe-id.jpg',
      genres: ['Puzzle'],
      metadata: { igdbId: 7, platforms: ['PC'] },
    });
  });

  it('rejects records without a collision-safe provider id', () => {
    expect(normalizeIgdbGame({ name: 'No id' } as IgdbGame)).toBeNull();
  });

  it('accepts legacy age-rating fields during the IGDB migration window', () => {
    const normalized = normalizeIgdbGame({
      id: 8,
      age_ratings: [{
        category: { id: 1, name: 'ESRB' },
        rating: { id: 11, name: 'M' },
        content_descriptions: [{ description: 'Violence' }],
      }],
    });

    expect(normalized?.metadata.ageRatings).toEqual([{
      organization: { id: 1, name: 'ESRB' },
      ratingCategory: { id: 11, rating: 'M' },
      contentDescriptions: ['Violence'],
    }]);
  });
});

describe('normalizeIgdbImageUrl', () => {
  it('forces HTTPS and replaces the IGDB image size token', () => {
    expect(
      normalizeIgdbImageUrl(
        'http://images.igdb.com/igdb/image/upload/t_thumb/id.jpg?x=1',
        't_cover_big',
      ),
    ).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/id.jpg?x=1');
  });
});
