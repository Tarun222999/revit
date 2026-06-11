import { isMediaType } from '@/constants/media';
import type {
  ListCoverMedia,
  ListItemMedia,
  MediaItemRow,
  UserListDetails,
  UserListDetailsRow,
  UserListItem,
  UserListItemRow,
  UserListSummary,
  UserListSummaryItemRow,
  UserListSummaryRow,
} from '@/features/lists/types';
import type { MediaSource } from '@/types/media';

const MEDIA_SOURCES = ['tmdb', 'igdb'] as const;
const RELEASE_YEAR_LENGTH = 4;
const DEFAULT_COVER_ITEM_LIMIT = 4;

function isMediaSource(value: string): value is MediaSource {
  return MEDIA_SOURCES.includes(value as MediaSource);
}

function normalizeGenres(value: MediaItemRow['genres']) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((genre): genre is string => typeof genre === 'string');
}

function normalizeMetadata(value: MediaItemRow['metadata']): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getReleaseYear(releaseDate: string | null) {
  if (!releaseDate) {
    return null;
  }

  const year = releaseDate.slice(0, RELEASE_YEAR_LENGTH);

  return /^\d{4}$/.test(year) ? year : null;
}

function compareDateDesc(a: string, b: string) {
  return b.localeCompare(a);
}

function compareListItemOrder(
  a: Pick<UserListSummaryItemRow, 'created_at' | 'id' | 'position'>,
  b: Pick<UserListSummaryItemRow, 'created_at' | 'id' | 'position'>,
) {
  if (a.position != null && b.position != null) {
    return a.position - b.position || compareDateDesc(a.created_at, b.created_at);
  }

  if (a.position != null) {
    return -1;
  }

  if (b.position != null) {
    return 1;
  }

  return compareDateDesc(a.created_at, b.created_at) || a.id.localeCompare(b.id);
}

/**
 * Converts normalized media row data into the shape list item UI and navigation
 * need.
 *
 * @param mediaItem - Joined media item row from Supabase.
 * @returns UI-ready list item media data.
 */
export function toListItemMedia(mediaItem: MediaItemRow): ListItemMedia {
  if (!isMediaType(mediaItem.media_type)) {
    throw new Error(`Unsupported media type: ${mediaItem.media_type}`);
  }

  if (!isMediaSource(mediaItem.source)) {
    throw new Error(`Unsupported media source: ${mediaItem.source}`);
  }

  return {
    backdropUrl: mediaItem.backdrop_url,
    genres: normalizeGenres(mediaItem.genres),
    id: mediaItem.id,
    imageUrl: mediaItem.image_url,
    mediaType: mediaItem.media_type,
    metadata: normalizeMetadata(mediaItem.metadata),
    originalTitle: mediaItem.original_title,
    releaseDate: mediaItem.release_date,
    source: mediaItem.source,
    sourceId: mediaItem.source_id,
    title: mediaItem.title,
    year: getReleaseYear(mediaItem.release_date),
  };
}

function toListCoverMedia(mediaItem: MediaItemRow): ListCoverMedia {
  const normalizedMedia = toListItemMedia(mediaItem);

  return {
    imageUrl: normalizedMedia.imageUrl,
    mediaItemId: normalizedMedia.id,
    mediaType: normalizedMedia.mediaType,
    title: normalizedMedia.title,
  };
}

/**
 * Converts a joined list item row into the shape consumed by Single List Details.
 *
 * @param row - List item row with joined media metadata.
 * @returns UI-ready list item.
 */
export function toUserListItem(row: UserListItemRow): UserListItem {
  if (!row.media_items) {
    throw new Error(`List item ${row.id} is missing media item metadata.`);
  }

  return {
    createdAt: row.created_at,
    id: row.id,
    listId: row.list_id,
    media: toListItemMedia(row.media_items),
    mediaItemId: row.media_item_id,
    note: row.note,
    position: row.position,
  };
}

/**
 * Converts a list row and its joined item metadata into an overview-card model.
 *
 * @param row - List row with a lightweight list item/media join.
 * @param coverItemLimit - Maximum number of cover items to include.
 * @returns UI-ready list summary.
 */
export function toUserListSummary(
  row: UserListSummaryRow,
  coverItemLimit = DEFAULT_COVER_ITEM_LIMIT,
): UserListSummary {
  const listItems = [...(row.list_items ?? [])].sort(compareListItemOrder);
  const coverItems = listItems
    .map((item) => {
      if (!item.media_items) {
        throw new Error(`List item ${item.id} is missing media item metadata.`);
      }

      return toListCoverMedia(item.media_items);
    })
    .slice(0, coverItemLimit);

  return {
    coverItems,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    isDefault: row.is_default,
    itemCount: listItems.length,
    name: row.name,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

/**
 * Converts list overview query rows into UI-ready list summaries.
 *
 * @param rows - List rows with lightweight joined item/media metadata.
 * @returns UI-ready list summaries.
 */
export function toUserListSummaries(rows: UserListSummaryRow[]) {
  return rows.map((row) => toUserListSummary(row));
}

/**
 * Converts a full list details row into the Single List Details view model.
 *
 * @param row - List row with joined list items and media metadata.
 * @returns UI-ready list details.
 */
export function toUserListDetails(row: UserListDetailsRow): UserListDetails {
  const items = [...(row.list_items ?? [])]
    .sort(compareListItemOrder)
    .map(toUserListItem);

  return {
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    isDefault: row.is_default,
    itemCount: items.length,
    items,
    name: row.name,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}
