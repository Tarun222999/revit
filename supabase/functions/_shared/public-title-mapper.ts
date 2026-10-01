import type { PublicCatalogTitle } from '../../../types/publicCatalogTitle.ts';
import type { PublicTitleIdentity } from './public-title-handler.ts';

export type MediaItemPublicRow = {
  source: 'tmdb' | 'igdb';
  source_id: string;
  media_type: 'movie' | 'series' | 'anime' | 'game';
  title: string;
  original_title: string | null;
  description: string | null;
  release_date: string | null;
  image_url: string | null;
  backdrop_url: string | null;
  genres: unknown;
  metadata: unknown;
};

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function metadataValue(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) return value;
  return value && typeof value === 'object' ? value : undefined;
}

function pickPublicMetadata(row: MediaItemPublicRow) {
  const source = record(row.metadata);
  const allowedKeys = row.source === 'tmdb'
    ? ['voteAverage', 'runtime', 'episodeRuntime', 'seasonCount', 'networks', 'productionCompanies', 'originalLanguage']
    : ['ageRatings', 'gameModes', 'playerPerspectives', 'themes', 'platforms', 'releaseDates', 'developers', 'publishers', 'timeToBeat', 'youtubeVideo', 'websites', 'totalRating', 'totalRatingCount'];

  return Object.fromEntries(
    allowedKeys.flatMap((key) => {
      const value = metadataValue(source[key]);
      return value === undefined ? [] : [[key, value]];
    }),
  );
}

function isEligible(row: MediaItemPublicRow, identity: PublicTitleIdentity) {
  if (row.source !== identity.source || row.source_id !== identity.sourceId) return false;
  if (identity.kind === 'movie') return row.media_type === 'movie';
  if (identity.kind === 'tv') return row.media_type === 'series' || row.media_type === 'anime';
  return row.media_type === 'game';
}

/** Maps a whitelisted media_items projection to the anonymous public DTO. */
export function toPublicCatalogTitle(
  row: MediaItemPublicRow,
  identity: PublicTitleIdentity,
): PublicCatalogTitle | null {
  if (!isEligible(row, identity)) return null;

  return {
    source: row.source,
    sourceId: row.source_id,
    mediaType: row.media_type,
    title: row.title,
    originalTitle: row.original_title,
    description: row.description,
    releaseDate: row.release_date,
    year: row.release_date?.slice(0, 4) ?? null,
    imageUrl: row.image_url,
    backdropUrl: row.backdrop_url,
    genres: strings(row.genres),
    metadata: pickPublicMetadata(row),
  };
}
