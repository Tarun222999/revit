import { isJournalStatus } from '@/constants/journal';
import { isMediaType } from '@/constants/media';
import type {
  JournalListEntry,
  JournalListEntryRow,
  MediaItemRow,
} from '@/features/journal/types';
import type { MediaSource } from '@/types/media';

const MEDIA_SOURCES = ['tmdb', 'igdb'] as const;

function isMediaSource(value: string): value is MediaSource {
  return MEDIA_SOURCES.includes(value as MediaSource);
}

function toGenres(value: MediaItemRow['genres']) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((genre): genre is string => typeof genre === 'string');
}

function toMetadata(value: MediaItemRow['metadata']): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toYear(releaseDate: string | null) {
  if (!releaseDate) {
    return null;
  }

  const year = releaseDate.slice(0, 4);

  return /^\d{4}$/.test(year) ? year : null;
}

export function toJournalListEntry(row: JournalListEntryRow): JournalListEntry {
  const mediaItem = row.media_items;

  if (!mediaItem) {
    throw new Error(`Journal entry ${row.id} is missing media item metadata.`);
  }

  if (!isJournalStatus(row.status)) {
    throw new Error(`Unsupported journal status: ${row.status}`);
  }

  if (!isMediaType(mediaItem.media_type)) {
    throw new Error(`Unsupported media type: ${mediaItem.media_type}`);
  }

  if (!isMediaSource(mediaItem.source)) {
    throw new Error(`Unsupported media source: ${mediaItem.source}`);
  }

  return {
    backdropUrl: mediaItem.backdrop_url,
    completedOn: row.completed_on,
    containsSpoilers: row.contains_spoilers,
    createdAt: row.created_at,
    description: mediaItem.description,
    genres: toGenres(mediaItem.genres),
    id: row.id,
    imageUrl: mediaItem.image_url,
    lastActivityAt: row.last_activity_at,
    mediaItemId: row.media_item_id,
    mediaType: mediaItem.media_type,
    metadata: toMetadata(mediaItem.metadata),
    originalTitle: mediaItem.original_title,
    rating: row.rating,
    releaseDate: mediaItem.release_date,
    reviewBody: row.review_body,
    reviewHeadline: row.review_headline,
    source: mediaItem.source,
    sourceId: mediaItem.source_id,
    status: row.status,
    title: mediaItem.title,
    updatedAt: row.updated_at,
    year: toYear(mediaItem.release_date),
  };
}

export function toJournalListEntries(rows: JournalListEntryRow[]) {
  return rows.map(toJournalListEntry);
}
