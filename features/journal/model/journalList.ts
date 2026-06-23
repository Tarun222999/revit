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
const RELEASE_YEAR_LENGTH = 4;
const TIMELINE_MONTH_KEY_LENGTH = 7;
const TIMELINE_MONTH_LOCALE = 'en';
const LAST_30_DAYS = 30;
const MINIMUM_STRONG_RATING = 4;
const MINIMUM_POSITIVE_RATING = 3;

export const JOURNAL_DEFAULT_FILTERS: JournalListFilters = {
  date: 'all',
  mediaType: 'all',
  rating: 'any',
  statuses: [],
};

export const JOURNAL_DEFAULT_SORT: JournalSort = 'recent_activity';

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

/**
 * Converts a Supabase journal row into the normalized shape consumed by journal
 * screens.
 *
 * @param row - Journal row with its joined media item metadata.
 * @returns A UI-ready journal entry with validated status/source/media values.
 */
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
    genres: normalizeGenres(mediaItem.genres),
    id: row.id,
    imageUrl: mediaItem.image_url,
    lastActivityAt: row.last_activity_at,
    mediaItemId: row.media_item_id,
    mediaType: mediaItem.media_type,
    metadata: normalizeMetadata(mediaItem.metadata),
    originalTitle: mediaItem.original_title,
    rating: row.rating,
    releaseDate: mediaItem.release_date,
    reviewBody: row.review_body,
    reviewHeadline: row.review_headline,
    source: mediaItem.source,
    sourceId: mediaItem.source_id,
    startedOn: row.started_on,
    status: row.status,
    title: mediaItem.title,
    updatedAt: row.updated_at,
    year: getReleaseYear(mediaItem.release_date),
  };
}

/**
 * Converts a list of Supabase journal rows into normalized journal entries.
 *
 * @param rows - Journal rows with joined media item metadata.
 * @returns UI-ready journal entries.
 */
export function toJournalListEntries(rows: JournalListEntryRow[]) {
  return rows.map(toJournalListEntry);
}

function matchesRatingFilter(
  entry: JournalListEntry,
  rating: JournalListFilters['rating'],
) {
  switch (rating) {
    case 'any':
      return true;
    case 'rated':
      return entry.rating != null;
    case 'unrated':
      return entry.rating == null;
    case 'gte_4':
      return entry.rating != null && entry.rating >= MINIMUM_STRONG_RATING;
    case 'gte_3':
      return entry.rating != null && entry.rating >= MINIMUM_POSITIVE_RATING;
  }
}

function getDateFilterStart(dateFilter: JournalListFilters['date']) {
  if (dateFilter === 'all') {
    return null;
  }

  const now = new Date();
  const startDate = new Date(now);

  if (dateFilter === 'this_month') {
    startDate.setDate(1);
  }

  if (dateFilter === 'last_30_days') {
    startDate.setDate(now.getDate() - LAST_30_DAYS);
  }

  if (dateFilter === 'this_year') {
    startDate.setMonth(0, 1);
  }

  startDate.setHours(0, 0, 0, 0);

  return startDate;
}

function matchesDateFilter(entry: JournalListEntry, filters: JournalListFilters) {
  const startDate = getDateFilterStart(filters.date);

  if (!startDate) {
    return true;
  }

  return new Date(entry.createdAt) >= startDate;
}

/**
 * Checks whether a journal list has any non-default filter selected.
 *
 * @param filters - Current journal filter values.
 * @returns True when at least one filter narrows the list.
 */
export function hasActiveJournalFilters(filters: JournalListFilters) {
  return (
    filters.date !== JOURNAL_DEFAULT_FILTERS.date ||
    filters.mediaType !== JOURNAL_DEFAULT_FILTERS.mediaType ||
    filters.statuses.length > 0 ||
    filters.rating !== JOURNAL_DEFAULT_FILTERS.rating
  );
}

function matchesMediaFilter(entry: JournalListEntry, filters: JournalListFilters) {
  return filters.mediaType === 'all' || entry.mediaType === filters.mediaType;
}

function matchesStatusFilter(entry: JournalListEntry, filters: JournalListFilters) {
  return filters.statuses.length === 0 || filters.statuses.includes(entry.status);
}

/**
 * Applies the selected media, status, and rating filters to journal entries.
 *
 * @param entries - Normalized journal entries.
 * @param filters - Current journal filter values.
 * @returns Entries matching every active filter.
 */
export function filterJournalEntries(
  entries: JournalListEntry[],
  filters: JournalListFilters,
) {
  return entries.filter(
    (entry) =>
      matchesMediaFilter(entry, filters) &&
      matchesStatusFilter(entry, filters) &&
      matchesRatingFilter(entry, filters.rating) &&
      matchesDateFilter(entry, filters),
  );
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

const JOURNAL_SORT_COMPARATORS: Record<
  JournalSort,
  (a: JournalListEntry, b: JournalListEntry) => number
> = {
  rating: compareRatingDesc,
  recent_activity: (a, b) => compareDateDesc(a.lastActivityAt, b.lastActivityAt),
  recently_added: (a, b) => compareDateDesc(a.createdAt, b.createdAt),
  title: compareTitleAsc,
};

/**
 * Sorts journal entries without mutating the original input array.
 *
 * @param entries - Normalized journal entries.
 * @param sort - Selected journal sort mode.
 * @returns A new array ordered for the active journal view.
 */
export function sortJournalEntries(entries: JournalListEntry[], sort: JournalSort) {
  return [...entries].sort(JOURNAL_SORT_COMPARATORS[sort]);
}

/**
 * Filters and sorts entries for the visible Journal screen list.
 *
 * @param entries - Normalized journal entries.
 * @param filters - Current journal filter values.
 * @param sort - Selected journal sort mode.
 * @returns Entries ready to render in the current journal view.
 */
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

function getTimelineGroupDate(entry: JournalListEntry, sort: JournalSort) {
  return sort === 'recently_added' ? entry.createdAt : entry.lastActivityAt;
}

function getTimelineMonthKey(date: string) {
  return date.slice(0, TIMELINE_MONTH_KEY_LENGTH);
}

function getTimelineMonthTitle(date: string) {
  return new Intl.DateTimeFormat(TIMELINE_MONTH_LOCALE, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Groups sorted journal entries into month buckets for the timeline view.
 *
 * @param entries - Entries already filtered and sorted for the timeline.
 * @param sort - Active sort mode, used to choose the grouping date.
 * @returns Month-based timeline groups in the original entry order.
 */
export function getJournalTimelineGroups(
  entries: JournalListEntry[],
  sort: JournalSort,
): JournalTimelineGroup[] {
  const groups = new Map<string, JournalTimelineGroup>();

  entries.forEach((entry) => {
    const timelineDate = getTimelineGroupDate(entry, sort);
    const key = getTimelineMonthKey(timelineDate);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.entries.push(entry);
      return;
    }

    groups.set(key, {
      entries: [entry],
      key,
      title: getTimelineMonthTitle(timelineDate),
    });
  });

  return Array.from(groups.values());
}
