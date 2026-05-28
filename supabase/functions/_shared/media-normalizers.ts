import { buildTmdbImageUrl } from './tmdb.ts';

export type MediaSource = 'tmdb' | 'igdb';
export type MediaType = 'movie' | 'series' | 'anime' | 'game';

export type NormalizedMediaItem = {
  id?: string;
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  releaseDate?: string | null;
  year?: string | null;
  imageUrl?: string | null;
  backdropUrl?: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
};

export type MediaItemRow = {
  id: string;
  source: MediaSource;
  source_id: string;
  media_type: MediaType;
  title: string;
  original_title: string | null;
  description: string | null;
  release_date: string | null;
  image_url: string | null;
  backdrop_url: string | null;
  genres: unknown;
  metadata: unknown;
};

type TmdbGenre = {
  id: number;
  name: string;
};

export type TmdbMovieResult = {
  id: number;
  title?: string;
  original_title?: string;
  overview?: string | null;
  release_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  popularity?: number;
  vote_average?: number;
  runtime?: number | null;
  production_companies?: Array<{ name?: string }>;
  original_language?: string | null;
  media_type?: string;
};

export type TmdbTvResult = {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string | null;
  first_air_date?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  popularity?: number;
  vote_average?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  networks?: Array<{ name?: string }>;
  production_companies?: Array<{ name?: string }>;
  original_language?: string | null;
  origin_country?: string[];
  media_type?: string;
};

const ANIMATION_GENRE_ID = 16;

function compactStrings(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

function genreNames(result: { genres?: TmdbGenre[]; genre_ids?: number[] }) {
  if (result.genres?.length) {
    return result.genres
      .map((genre) => genre.name)
      .filter((name): name is string => Boolean(name));
  }

  return [];
}

function genreIds(result: { genres?: TmdbGenre[]; genre_ids?: number[] }) {
  if (result.genre_ids?.length) {
    return result.genre_ids;
  }

  return result.genres?.map((genre) => genre.id) ?? [];
}

function yearFromDate(date: string | null | undefined) {
  return date ? date.slice(0, 4) : null;
}

export function isLikelyAnime(result: TmdbTvResult) {
  const ids = genreIds(result);
  const countries = result.origin_country ?? [];

  return (
    ids.includes(ANIMATION_GENRE_ID) &&
    result.original_language === 'ja' &&
    countries.includes('JP')
  );
}

export function normalizeTmdbMovie(
  result: TmdbMovieResult,
): NormalizedMediaItem {
  const releaseDate = result.release_date || null;

  return {
    source: 'tmdb',
    sourceId: `movie:${result.id}`,
    mediaType: 'movie',
    title: result.title || result.original_title || 'Untitled movie',
    originalTitle: result.original_title ?? null,
    description: result.overview ?? null,
    releaseDate,
    year: yearFromDate(releaseDate),
    imageUrl: buildTmdbImageUrl(result.poster_path),
    backdropUrl: buildTmdbImageUrl(result.backdrop_path, 'w780'),
    genres: genreNames(result),
    metadata: {
      tmdbId: result.id,
      tmdbMediaType: 'movie',
      popularity: result.popularity,
      voteAverage: result.vote_average,
      runtime: result.runtime,
      productionCompanies: compactStrings(
        result.production_companies?.map((company) => company.name) ?? [],
      ),
      originalLanguage: result.original_language,
    },
  };
}

export function normalizeTmdbTv(
  result: TmdbTvResult,
  options: { forceAnime?: boolean } = {},
): NormalizedMediaItem {
  const releaseDate = result.first_air_date || null;
  const mediaType: MediaType =
    options.forceAnime || isLikelyAnime(result) ? 'anime' : 'series';

  return {
    source: 'tmdb',
    sourceId: `tv:${result.id}`,
    mediaType,
    title: result.name || result.original_name || 'Untitled series',
    originalTitle: result.original_name ?? null,
    description: result.overview ?? null,
    releaseDate,
    year: yearFromDate(releaseDate),
    imageUrl: buildTmdbImageUrl(result.poster_path),
    backdropUrl: buildTmdbImageUrl(result.backdrop_path, 'w780'),
    genres: genreNames(result),
    metadata: {
      tmdbId: result.id,
      tmdbMediaType: 'tv',
      popularity: result.popularity,
      voteAverage: result.vote_average,
      episodeRuntime: result.episode_run_time,
      seasonCount: result.number_of_seasons,
      networks: compactStrings(
        result.networks?.map((network) => network.name) ?? [],
      ),
      productionCompanies: compactStrings(
        result.production_companies?.map((company) => company.name) ?? [],
      ),
      originalLanguage: result.original_language,
      originCountry: result.origin_country,
    },
  };
}

export function toMediaItemRow(item: NormalizedMediaItem) {
  return {
    source: item.source,
    source_id: item.sourceId,
    media_type: item.mediaType,
    title: item.title,
    original_title: item.originalTitle ?? null,
    description: item.description ?? null,
    release_date: item.releaseDate ?? null,
    image_url: item.imageUrl ?? null,
    backdrop_url: item.backdropUrl ?? null,
    genres: item.genres,
    metadata: item.metadata,
  };
}

export function fromMediaItemRow(row: MediaItemRow): NormalizedMediaItem {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.source_id,
    mediaType: row.media_type,
    title: row.title,
    originalTitle: row.original_title,
    description: row.description,
    releaseDate: row.release_date,
    year: yearFromDate(row.release_date),
    imageUrl: row.image_url,
    backdropUrl: row.backdrop_url,
    genres: Array.isArray(row.genres) ? (row.genres as string[]) : [],
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}
