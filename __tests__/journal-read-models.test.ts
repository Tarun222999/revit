import { getJournalEventCursorFilter } from '@/features/journal/api/journal-read-api';
import {
  assertJournalDate,
  assertJournalDateRange,
  getJournalPlannerSection,
  toJournalEvent,
  toJournalHistoryPage,
  toJournalTimelineItem,
  toJournalTitleState,
} from '@/features/journal/model/journalReadModels';
import type {
  JournalEntryRow,
  JournalEventRow,
} from '@/features/journal/types';

function makeTitleRow(overrides: Partial<JournalEntryRow> = {}): JournalEntryRow {
  return {
    effective_status: 'completed',
    completed_on: null,
    contains_spoilers: false,
    created_at: '2026-07-01T10:00:00.000Z',
    has_active_plan: false,
    id: 'entry-1',
    last_activity_at: '2026-07-01T10:00:00.000Z',
    legacy_bridge_statement_at: null,
    legacy_plan_resolution_statement_at: null,
    media_item_id: 'media-1',
    planned_for: null,
    rating: null,
    review_body: null,
    review_headline: null,
    started_on: null,
    status: 'completed',
    updated_at: '2026-07-01T10:00:00.000Z',
    undated_completed_count: 0,
    user_id: 'user-1',
    ...overrides,
  };
}

function makeEventRow(overrides: Partial<JournalEventRow> = {}): JournalEventRow {
  return {
    created_at: '2026-07-30T10:00:00.000Z',
    event_date: '2026-07-30',
    event_type: 'completed',
    id: 'event-1',
    is_legacy_mirror: false,
    journal_entry_id: 'entry-1',
    legacy_bridge_statement_at: null,
    notes: 'Worth another watch.',
    operation_id: null,
    rating: 4.5,
    resolved_active_plan: false,
    updated_at: '2026-07-30T10:00:00.000Z',
    user_id: 'user-1',
    ...overrides,
  };
}

describe('v1.1 Journal read models', () => {
  it('maps title state and keeps Someday distinct from no plan', () => {
    expect(toJournalTitleState(makeTitleRow())).toMatchObject({
      activePlan: null,
      status: 'completed',
      undatedCompletedCount: 0,
    });

    expect(
      toJournalTitleState(
        makeTitleRow({ has_active_plan: true, planned_for: null }),
      ),
    ).toMatchObject({ activePlan: { plannedFor: null } });
  });

  it('uses v1.1 effective state when the legacy projection shows a plan', () => {
    expect(
      toJournalTitleState(
        makeTitleRow({
          effective_status: 'completed',
          has_active_plan: true,
          planned_for: '2026-09-20',
          status: 'planned',
        }),
      ),
    ).toMatchObject({
      activePlan: { plannedFor: '2026-09-20' },
      status: 'completed',
    });
  });

  it('treats a dated completion as a rewatch after an undated legacy completion', () => {
    const origins = new Map([
      [
        'entry-1',
        { firstCompletedEventId: 'event-1', hasUndatedCompletion: true },
      ],
    ]);

    expect(
      toJournalTimelineItem(
        {
          ...makeEventRow(),
          journal_entries: {
            ...makeTitleRow({ undated_completed_count: 1 }),
            media_items: {
              id: 'media-1',
              image_url: null,
              media_type: 'movie',
              original_title: null,
              release_date: '2026-01-01',
              source: 'tmdb',
              source_id: 'movie:1',
              title: 'Legacy watch',
            },
          },
        },
        origins,
      ).isRewatch,
    ).toBe(true);
  });

  it('maps a completed event without exposing system timestamps as activity dates', () => {
    expect(toJournalEvent(makeEventRow())).toEqual({
      eventDate: '2026-07-30',
      id: 'event-1',
      journalEntryId: 'entry-1',
      notes: 'Worth another watch.',
      rating: 4.5,
      type: 'completed',
    });

    expect(() =>
      toJournalEvent(
        makeEventRow({ event_date: '2026-07-30T10:00:00.000Z' }),
      ),
    ).toThrow('Event date must use YYYY-MM-DD');
  });

  it('bounds History pages and creates a stable same-day cursor', () => {
    const rows = [
      makeEventRow({ created_at: '2026-07-30T12:00:00.000Z', id: 'event-3' }),
      makeEventRow({ created_at: '2026-07-30T11:00:00.000Z', id: 'event-2' }),
      makeEventRow({ created_at: '2026-07-30T10:00:00.000Z', id: 'event-1' }),
    ];

    expect(toJournalHistoryPage(rows, 2)).toEqual({
      events: [toJournalEvent(rows[0]), toJournalEvent(rows[1])],
      nextCursor: {
        createdAt: '2026-07-30T11:00:00.000Z',
        eventDate: '2026-07-30',
        id: 'event-2',
      },
    });

    expect(
      getJournalEventCursorFilter({
        createdAt: '2026-07-30T11:00:00.000Z',
        eventDate: '2026-07-30',
        id: 'event-2',
      }),
    ).toContain(
      'and(event_date.eq.2026-07-30,created_at.eq.2026-07-30T11:00:00.000Z,id.lt.event-2)',
    );
  });

  it('validates date-only ranges without timezone conversion', () => {
    expect(assertJournalDate('2024-02-29')).toBe('2024-02-29');
    expect(assertJournalDateRange('2026-06-28', '2026-08-08')).toEqual({
      endDate: '2026-08-08',
      startDate: '2026-06-28',
    });
    expect(() => assertJournalDate('2025-02-29')).toThrow(
      'not a real calendar date',
    );
    expect(() => assertJournalDateRange('2026-08-01', '2026-07-01')).toThrow(
      'start must not be after',
    );
  });

  it('classifies Planner rows from explicit local dates', () => {
    expect(getJournalPlannerSection('2026-07-27', '2026-07-28')).toBe('missed');
    expect(getJournalPlannerSection('2026-07-28', '2026-07-28')).toBe('today');
    expect(getJournalPlannerSection('2026-07-29', '2026-07-28')).toBe(
      'upcoming',
    );
    expect(getJournalPlannerSection(null, '2026-07-28')).toBe('someday');
  });
});
