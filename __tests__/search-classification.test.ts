/* eslint-disable @typescript-eslint/no-require-imports */
const { filterTmdbTvSearchResults } = require(
  '@/supabase/functions/_shared/media-normalizers.ts',
);

type TmdbTvResult = {
  id: number;
  genre_ids?: number[];
  original_language?: string | null;
  origin_country?: string[];
};

const anime: TmdbTvResult = {
  id: 1,
  genre_ids: [16],
  original_language: 'ja',
  origin_country: ['JP'],
};

const series: TmdbTvResult = {
  id: 2,
  genre_ids: [18],
  original_language: 'en',
  origin_country: ['US'],
};

describe('TMDB search classification', () => {
  it('keeps Anime out of the Series filter', () => {
    expect(filterTmdbTvSearchResults([anime, series], 'series')).toEqual([
      series,
    ]);
  });

  it('keeps only Anime in the Anime filter', () => {
    expect(filterTmdbTvSearchResults([anime, series], 'anime')).toEqual([
      anime,
    ]);
  });

  it('preserves the full TV response for All', () => {
    expect(filterTmdbTvSearchResults([anime, series], 'all')).toEqual([
      anime,
      series,
    ]);
  });
});
