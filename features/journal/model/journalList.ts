import { isJournalStatus } from '@/constants/journal';
import { isMediaType } from '@/constants/media';
import type {
  JournalListFilters,
  JournalListEntry,
  JournalListEntryRow,
  JournalSort,
  JournalTimelineGroup,
  MediaItemRow,
} from '@/features/journal/types';
import type { MediaSource } from '@/types/media';

const MEDIA_SOURCES = ['tmdb', 'igdb'] as const;

export const JOURNAL_DEFAULT_FILTERS: JournalListFilters = {
  mediaType: 'all',
  rating: 'any',
  status: 'all',
};

export const JOURNAL_DEFAULT_SORT: JournalSort = 'recent_activity';

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

function matchesRatingFilter(entry: JournalListEntry, rating: JournalListFilters['rating']) {
  switch (rating) {
    case 'any':
      return true;
    case 'rated':
      return entry.rating != null;
    case 'unrated':
      return entry.rating == null;
    case 'gte_4':
      return entry.rating != null && entry.rating >= 4;
    case 'gte_3':
      return entry.rating != null && entry.rating >= 3;
  }
}

export function hasActiveJournalFilters(filters: JournalListFilters) {
  return (
    filters.mediaType !== JOURNAL_DEFAULT_FILTERS.mediaType ||
    filters.rating !== JOURNAL_DEFAULT_FILTERS.rating ||
    filters.status !== JOURNAL_DEFAULT_FILTERS.status
  );
}

export function filterJournalEntries(
  entries: JournalListEntry[],
  filters: JournalListFilters,
) {
  return entries.filter((entry) => {
    if (filters.mediaType !== 'all' && entry.mediaType !== filters.mediaType) {
      return false;
    }

    if (filters.status !== 'all' && entry.status !== filters.status) {
      return false;
    }

    return matchesRatingFilter(entry, filters.rating);
  });
}

function compareDateDesc(a: string, b: string) {
  return b.localeCompare(a);
}

function compareTitleAsc(a: JournalListEntry, b: JournalListEntry) {
  return (
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
    compareDateDesc(a.lastActivityAt, b.lastActivityAt)
  );
}

function compareRatingDesc(a: JournalListEntry, b: JournalListEntry) {
  if (a.rating == null && b.rating == null) {
    return compareDateDesc(a.lastActivityAt, b.lastActivityAt);
  }

  if (a.rating == null) {
    return 1;
  }

  if (b.rating == null) {
    return -1;
  }

  return b.rating - a.rating || compareDateDesc(a.lastActivityAt, b.lastActivityAt);
}

export function sortJournalEntries(entries: JournalListEntry[], sort: JournalSort) {
  return [...entries].sort((a, b) => {
    switch (sort) {
      case 'recent_activity':
        return compareDateDesc(a.lastActivityAt, b.lastActivityAt);
      case 'recently_added':
        return compareDateDesc(a.createdAt, b.createdAt);
      case 'rating':
        return compareRatingDesc(a, b);
      case 'title':
        return compareTitleAsc(a, b);
    }
  });
}

export function getVisibleJournalEntries({
  entries,
  filters,
  sort,
}: {
  entries: JournalListEntry[];
  filters: JournalListFilters;
  sort: JournalSort;
}) {
  return sortJournalEntries(filterJournalEntries(entries, filters), sort);
}

function getTimelineDate(entry: JournalListEntry, sort: JournalSort) {
  return sort === 'recently_added' ? entry.createdAt : entry.lastActivityAt;
}

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function getMonthTitle(date: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function getJournalTimelineGroups(
  entries: JournalListEntry[],
  sort: JournalSort,
): JournalTimelineGroup[] {
  const groups = new Map<string, JournalTimelineGroup>();

  entries.forEach((entry) => {
    const timelineDate = getTimelineDate(entry, sort);
    const key = getMonthKey(timelineDate);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.entries.push(entry);
      return;
    }

    groups.set(key, {
      entries: [entry],
      key,
      title: getMonthTitle(timelineDate),
    });
  });

  return Array.from(groups.values());
}
