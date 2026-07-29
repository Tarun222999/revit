import {
  assertJournalDate,
  assertJournalDateRange,
  toJournalCalendarEventItem,
  toJournalCalendarPlanItem,
  toJournalEvent,
  toJournalHistoryPage,
  toJournalPlannerItem,
  toJournalTimelinePage,
  toJournalTitleState,
  type JournalEventWithTitleRow,
  type JournalTitleStateWithMediaRow,
} from '@/features/journal/model/journalReadModels';
import type {
  JournalCalendarData,
  JournalEventCursor,
  JournalHistoryPage,
  JournalPlannerItem,
  JournalTimelinePage,
  JournalTitleSummary,
} from '@/features/journal/types';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const SAFE_CURSOR_VALUE = /^[0-9A-Za-z:._+-]+$/;

const MEDIA_SUMMARY_SELECT = `
  id,
  source,
  source_id,
  media_type,
  title,
  original_title,
  release_date,
  image_url
`;

const TITLE_WITH_MEDIA_SELECT = `
  id,
  media_item_id,
  status,
  has_active_plan,
  planned_for,
  media_items!journal_entries_media_item_id_fkey (
    ${MEDIA_SUMMARY_SELECT}
  )
`;

const EVENT_WITH_TITLE_SELECT = `
  *,
  journal_entries!journal_events_entry_owner_fkey!inner (
    id,
    media_item_id,
    status,
    has_active_plan,
    planned_for,
    media_items!journal_entries_media_item_id_fkey!inner (
      ${MEDIA_SUMMARY_SELECT}
    )
  )
`;

function normalizePageSize(pageSize = DEFAULT_PAGE_SIZE) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new Error(`Journal page size must be between 1 and ${MAX_PAGE_SIZE}.`);
  }

  return pageSize;
}

function assertSafeCursorValue(value: string, label: string) {
  if (!SAFE_CURSOR_VALUE.test(value)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
  return value;
}

/** Builds a descending, deterministic keyset filter for event pages. */
export function getJournalEventCursorFilter(cursor: JournalEventCursor) {
  const eventDate = assertJournalDate(cursor.eventDate, 'Cursor event date');
  const createdAt = assertSafeCursorValue(cursor.createdAt, 'Cursor timestamp');
  const id = assertSafeCursorValue(cursor.id, 'Cursor id');

  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error('Cursor timestamp is invalid.');
  }

  return [
    `event_date.lt.${eventDate}`,
    `and(event_date.eq.${eventDate},created_at.lt.${createdAt})`,
    `and(event_date.eq.${eventDate},created_at.eq.${createdAt},id.lt.${id})`,
  ].join(',');
}

export async function getJournalTitleSummary({
  mediaItemId,
  userId,
}: {
  mediaItemId: string;
  userId: string;
}): Promise<JournalTitleSummary | null> {
  const { data: titleRow, error: titleError } = await supabase
    .from('journal_entries')
    .select('id, media_item_id, status, has_active_plan, planned_for')
    .eq('user_id', userId)
    .eq('media_item_id', mediaItemId)
    .maybeSingle();

  if (titleError) throw titleError;
  if (!titleRow) return null;

  const { count, data: completedRows, error: completedError } = await supabase
    .from('journal_events')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('journal_entry_id', titleRow.id)
    .eq('event_type', 'completed')
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);

  if (completedError) throw completedError;

  return {
    completedWatchCount: count ?? 0,
    latestCompletedEvent: completedRows?.[0]
      ? toJournalEvent(completedRows[0])
      : null,
    titleState: toJournalTitleState(titleRow),
  };
}

export async function getJournalHistoryPage({
  cursor,
  journalEntryId,
  pageSize: requestedPageSize,
  userId,
}: {
  cursor?: JournalEventCursor | null;
  journalEntryId: string;
  pageSize?: number;
  userId: string;
}): Promise<JournalHistoryPage> {
  const pageSize = normalizePageSize(requestedPageSize);
  let query = supabase
    .from('journal_events')
    .select('*')
    .eq('user_id', userId)
    .eq('journal_entry_id', journalEntryId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1);

  if (cursor) query = query.or(getJournalEventCursorFilter(cursor));

  const { data, error } = await query;
  if (error) throw error;

  return toJournalHistoryPage(data ?? [], pageSize);
}

export async function getJournalTimelinePage({
  cursor,
  pageSize: requestedPageSize,
  userId,
}: {
  cursor?: JournalEventCursor | null;
  pageSize?: number;
  userId: string;
}): Promise<JournalTimelinePage> {
  const pageSize = normalizePageSize(requestedPageSize);
  let query = supabase
    .from('journal_events')
    .select(EVENT_WITH_TITLE_SELECT)
    .eq('user_id', userId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(pageSize + 1);

  if (cursor) query = query.or(getJournalEventCursorFilter(cursor));

  const { data, error } = await query;
  if (error) throw error;

  return toJournalTimelinePage(
    (data ?? []) as unknown as JournalEventWithTitleRow[],
    pageSize,
  );
}

export async function getJournalPlanner({
  today,
  userId,
}: {
  today: string;
  userId: string;
}): Promise<JournalPlannerItem[]> {
  assertJournalDate(today, 'Today');

  const { data, error } = await supabase
    .from('journal_entries')
    .select(TITLE_WITH_MEDIA_SELECT)
    .eq('user_id', userId)
    .eq('has_active_plan', true)
    .order('planned_for', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return ((data ?? []) as unknown as JournalTitleStateWithMediaRow[]).map(
    (row) => toJournalPlannerItem(row, today),
  );
}

export async function getJournalCalendarRange({
  endDate,
  startDate,
  userId,
}: {
  endDate: string;
  startDate: string;
  userId: string;
}): Promise<JournalCalendarData> {
  assertJournalDateRange(startDate, endDate);

  const [eventResult, planResult] = await Promise.all([
    supabase
      .from('journal_events')
      .select(EVENT_WITH_TITLE_SELECT)
      .eq('user_id', userId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .order('event_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('journal_entries')
      .select(TITLE_WITH_MEDIA_SELECT)
      .eq('user_id', userId)
      .eq('has_active_plan', true)
      .not('planned_for', 'is', null)
      .gte('planned_for', startDate)
      .lte('planned_for', endDate)
      .order('planned_for', { ascending: true }),
  ]);

  if (eventResult.error) throw eventResult.error;
  if (planResult.error) throw planResult.error;

  const eventRows = (eventResult.data ?? []) as unknown as JournalEventWithTitleRow[];
  const planRows = (planResult.data ?? []) as unknown as JournalTitleStateWithMediaRow[];

  return {
    endDate,
    events: eventRows.map(toJournalCalendarEventItem),
    plans: planRows.map(toJournalCalendarPlanItem),
    startDate,
  };
}
