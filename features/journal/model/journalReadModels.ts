import { isJournalStatus } from '@/constants/journal';
import { isMediaType } from '@/constants/media';
import type {
  JournalCalendarEventItem,
  JournalCalendarPlanItem,
  JournalEntryRow,
  JournalEvent,
  JournalEventCursor,
  JournalEventRow,
  JournalHistoryPage,
  JournalMediaSummary,
  JournalPlannerItem,
  JournalPlannerSection,
  JournalTimelineItem,
  JournalTimelinePage,
  JournalTitleState,
  MediaItemRow,
} from '@/features/journal/types';
import { JOURNAL_EVENT_TYPES } from '@/features/journal/types';
import type { MediaSource } from '@/types/media';

export type JournalTitleStateRow = Pick<
  JournalEntryRow,
  | 'id'
  | 'media_item_id'
  | 'effective_status'
  | 'has_active_plan'
  | 'planned_for'
  | 'rating'
  | 'review_body'
  | 'undated_completed_count'
>;

export type JournalTitleStateWithMediaRow = JournalTitleStateRow & {
  media_items: JournalMediaSummaryRow | null;
};

export type JournalMediaSummaryRow = Pick<
  MediaItemRow,
  | 'id'
  | 'source'
  | 'source_id'
  | 'media_type'
  | 'title'
  | 'original_title'
  | 'release_date'
  | 'image_url'
>;

export type JournalEventWithTitleRow = JournalEventRow & {
  journal_entries: JournalTitleStateWithMediaRow | null;
};

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RELEASE_YEAR_LENGTH = 4;
const MEDIA_SOURCES = ['tmdb', 'igdb'] as const;

function isMediaSource(value: string): value is MediaSource {
  return MEDIA_SOURCES.includes(value as MediaSource);
}

export function assertJournalDate(value: string, label = 'Journal date') {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error(`${label} is not a real calendar date.`);
  }

  return value;
}

export function assertJournalDateRange(startDate: string, endDate: string) {
  assertJournalDate(startDate, 'Range start');
  assertJournalDate(endDate, 'Range end');

  if (startDate > endDate) {
    throw new Error('Journal date range start must not be after its end.');
  }

  return { endDate, startDate };
}

function getReleaseYear(releaseDate: string | null) {
  const year = releaseDate?.slice(0, RELEASE_YEAR_LENGTH) ?? null;
  return year && /^\d{4}$/.test(year) ? year : null;
}

export function toJournalMediaSummary(
  row: JournalMediaSummaryRow,
): JournalMediaSummary {
  if (!isMediaType(row.media_type)) {
    throw new Error(`Unsupported media type: ${row.media_type}`);
  }

  if (!isMediaSource(row.source)) {
    throw new Error(`Unsupported media source: ${row.source}`);
  }

  return {
    id: row.id,
    imageUrl: row.image_url,
    mediaType: row.media_type,
    originalTitle: row.original_title,
    releaseDate: row.release_date,
    source: row.source,
    sourceId: row.source_id,
    title: row.title,
    year: getReleaseYear(row.release_date),
  };
}

export function toJournalTitleState(row: JournalTitleStateRow): JournalTitleState {
  if (!isJournalStatus(row.effective_status)) {
    throw new Error(`Unsupported journal status: ${row.effective_status}`);
  }

  if (!row.has_active_plan && row.planned_for != null) {
    throw new Error(`Journal entry ${row.id} has a date without an active plan.`);
  }

  if (row.planned_for) {
    assertJournalDate(row.planned_for, 'Planned date');
  }

  return {
    activePlan: row.has_active_plan ? { plannedFor: row.planned_for } : null,
    id: row.id,
      mediaItemId: row.media_item_id,
      rating: row.rating,
      reviewBody: row.review_body,
    status: row.effective_status,
    undatedCompletedCount: row.undated_completed_count,
  };
}

function isJournalEventType(
  value: string,
): value is (typeof JOURNAL_EVENT_TYPES)[number] {
  return JOURNAL_EVENT_TYPES.includes(
    value as (typeof JOURNAL_EVENT_TYPES)[number],
  );
}

export function toJournalEvent(row: JournalEventRow): JournalEvent {
  if (!isJournalEventType(row.event_type)) {
    throw new Error(`Unsupported journal event type: ${row.event_type}`);
  }

  assertJournalDate(row.event_date, 'Event date');

  return {
    eventDate: row.event_date,
    id: row.id,
    journalEntryId: row.journal_entry_id,
    notes: row.notes,
    playedOnPlatform: row.played_on_platform,
    rating: row.rating,
    type: row.event_type,
  };
}

export function toJournalEventCursor(row: JournalEventRow): JournalEventCursor {
  return {
    createdAt: row.created_at,
    eventDate: assertJournalDate(row.event_date, 'Event date'),
    id: row.id,
  };
}

function splitPage<TRow extends JournalEventRow, TItem>(
  rows: TRow[],
  pageSize: number,
  mapItem: (row: TRow) => TItem,
) {
  const hasNextPage = rows.length > pageSize;
  const visibleRows = hasNextPage ? rows.slice(0, pageSize) : rows;

  return {
    items: visibleRows.map(mapItem),
    nextCursor:
      hasNextPage && visibleRows.length > 0
        ? toJournalEventCursor(visibleRows[visibleRows.length - 1])
        : null,
  };
}

export function toJournalHistoryPage(
  rows: JournalEventRow[],
  pageSize: number,
): JournalHistoryPage {
  const page = splitPage(rows, pageSize, toJournalEvent);
  return { events: page.items, nextCursor: page.nextCursor };
}

function requireJoinedTitle(row: JournalEventWithTitleRow) {
  const titleState = row.journal_entries;

  if (!titleState?.media_items) {
    throw new Error(`Journal event ${row.id} is missing title metadata.`);
  }

  return titleState as JournalTitleStateWithMediaRow & {
    media_items: JournalMediaSummaryRow;
  };
}

export function toJournalTimelineItem(
  row: JournalEventWithTitleRow,
  completionOrigins?: ReadonlyMap<
    string,
    { firstCompletedEventId: string | null; hasUndatedCompletion: boolean }
  >,
): JournalTimelineItem {
  const titleState = requireJoinedTitle(row);
  const completionOrigin = completionOrigins?.get(row.journal_entry_id);

  return {
    currentStatus: toJournalTitleState(titleState).status,
    event: toJournalEvent(row),
    isRewatch:
      row.event_type === 'completed' &&
      Boolean(completionOrigin) &&
      (completionOrigin?.hasUndatedCompletion ||
        completionOrigin?.firstCompletedEventId !== row.id),
    media: toJournalMediaSummary(titleState.media_items),
  };
}

export function toJournalTimelinePage(
  rows: JournalEventWithTitleRow[],
  pageSize: number,
  completionOrigins?: ReadonlyMap<
    string,
    { firstCompletedEventId: string | null; hasUndatedCompletion: boolean }
  >,
): JournalTimelinePage {
  const page = splitPage(rows, pageSize, (row) =>
    toJournalTimelineItem(row, completionOrigins),
  );
  return { items: page.items, nextCursor: page.nextCursor };
}

export function getJournalPlannerSection(
  plannedFor: string | null,
  today: string,
): JournalPlannerSection {
  assertJournalDate(today, 'Today');

  if (plannedFor == null) {
    return 'someday';
  }

  assertJournalDate(plannedFor, 'Planned date');

  if (plannedFor === today) return 'today';
  return plannedFor < today ? 'missed' : 'upcoming';
}

export function toJournalPlannerItem(
  row: JournalTitleStateWithMediaRow,
  today: string,
): JournalPlannerItem {
  if (!row.media_items) {
    throw new Error(`Journal entry ${row.id} is missing media item metadata.`);
  }

  const titleState = toJournalTitleState(row);

  if (!titleState.activePlan) {
    throw new Error(`Journal entry ${row.id} does not have an active plan.`);
  }

  return {
    media: toJournalMediaSummary(row.media_items),
    section: getJournalPlannerSection(titleState.activePlan.plannedFor, today),
    titleState,
  };
}

export function toJournalCalendarEventItem(
  row: JournalEventWithTitleRow,
): JournalCalendarEventItem {
  const titleState = requireJoinedTitle(row);
  return {
    event: toJournalEvent(row),
    media: toJournalMediaSummary(titleState.media_items),
  };
}

export function toJournalCalendarPlanItem(
  row: JournalTitleStateWithMediaRow,
): JournalCalendarPlanItem {
  if (!row.media_items || !row.has_active_plan || !row.planned_for) {
    throw new Error(`Journal entry ${row.id} is missing a scheduled plan.`);
  }

  return {
    journalEntryId: row.id,
    media: toJournalMediaSummary(row.media_items),
    plannedFor: assertJournalDate(row.planned_for, 'Planned date'),
  };
}
