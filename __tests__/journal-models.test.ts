import {
  filterJournalEntries,
  getJournalTimelineGroups,
  hasActiveJournalFilters,
  JOURNAL_DEFAULT_FILTERS,
  sortJournalEntries,
  toJournalListEntry,
} from '../features/journal/model/journalList';
import {
  addJournalCalendarMonths,
  getJournalCalendarMonth,
  getJournalCalendarMonthDate,
} from '../features/journal/model/journalCalendar';
import type { JournalListEntry } from '../features/journal/types';
import type { JournalListEntryRow } from '../features/journal/types';

function makeEntry(overrides: Partial<JournalListEntry> = {}): JournalListEntry {
  return {
    id: 'entry-1',
    mediaItemId: 'media-1',
    source: 'tmdb',
    sourceId: 'movie:1',
    mediaType: 'movie',
    title: 'A Title',
    originalTitle: null,
    description: null,
    releaseDate: '2024-03-01',
    year: '2024',
    imageUrl: null,
    backdropUrl: null,
    genres: [],
    metadata: {},
    status: 'completed',
    rating: 4,
    reviewHeadline: null,
    reviewBody: null,
    containsSpoilers: false,
    completedOn: '2024-03-10',
    startedOn: null,
    createdAt: '2024-03-10T10:00:00.000Z',
    updatedAt: '2024-03-10T10:00:00.000Z',
    lastActivityAt: '2024-03-10T10:00:00.000Z',
    ...overrides,
  };
}

function makeJournalRow(): JournalListEntryRow {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    media_item_id: 'media-1',
    status: 'completed',
    rating: 4.5,
    review_headline: 'Excellent',
    review_body: 'A memorable watch.',
    contains_spoilers: true,
    started_on: null,
    completed_on: '2025-04-20',
    has_active_plan: false,
    last_activity_at: '2025-04-21T10:00:00.000Z',
    legacy_bridge_statement_at: null,
    legacy_plan_resolution_statement_at: null,
    planned_for: null,
    undated_completed_count: 0,
    created_at: '2025-04-20T10:00:00.000Z',
    updated_at: '2025-04-21T10:00:00.000Z',
    media_items: {
      id: 'media-1',
      source: 'tmdb',
      source_id: 'movie:1',
      media_type: 'movie',
      title: 'Example Movie',
      original_title: 'Original Example Movie',
      description: 'A description.',
      release_date: '2025-04-20',
      image_url: 'poster.jpg',
      backdrop_url: 'backdrop.jpg',
      genres: ['Drama', 42, 'Mystery'],
      metadata: { runtime: 120 },
      created_at: '2025-04-20T10:00:00.000Z',
      updated_at: '2025-04-20T10:00:00.000Z',
    },
  };
}

describe('journal list models', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes a joined journal row for the UI', () => {
    const entry = toJournalListEntry(makeJournalRow());

    expect(entry).toMatchObject({
      genres: ['Drama', 'Mystery'],
      metadata: { runtime: 120 },
      mediaType: 'movie',
      source: 'tmdb',
      title: 'Example Movie',
      year: '2025',
    });
  });

  it('rejects journal rows without valid ownership metadata', () => {
    expect(() =>
      toJournalListEntry({ ...makeJournalRow(), media_items: null }),
    ).toThrow('missing media item metadata');

    expect(() =>
      toJournalListEntry({ ...makeJournalRow(), status: 'unknown' }),
    ).toThrow('Unsupported journal status');

    expect(() =>
      toJournalListEntry({
        ...makeJournalRow(),
        media_items: { ...makeJournalRow().media_items!, media_type: 'unknown' },
      }),
    ).toThrow('Unsupported media type');
  });

  it('filters by media type, status, rating, and date', () => {
    const entries = [
      makeEntry({
        id: 'recent-movie',
        createdAt: '2026-07-10T10:00:00.000Z',
        mediaType: 'movie',
        rating: 4.5,
        status: 'completed',
      }),
      makeEntry({
        id: 'old-series',
        createdAt: '2026-06-01T10:00:00.000Z',
        mediaType: 'series',
        rating: null,
        status: 'planned',
      }),
      makeEntry({
        id: 'old-anime',
        createdAt: '2025-12-01T10:00:00.000Z',
        mediaType: 'anime',
        rating: 3,
        status: 'dropped',
      }),
    ];

    expect(
      filterJournalEntries(entries, {
        date: 'this_month',
        mediaType: 'movie',
        rating: 'gte_4',
        statuses: ['completed'],
      }).map((entry) => entry.id),
    ).toEqual(['recent-movie']);

    expect(
      filterJournalEntries(entries, {
        ...JOURNAL_DEFAULT_FILTERS,
        rating: 'unrated',
      }).map((entry) => entry.id),
    ).toEqual(['old-series']);
  });

  it('recognizes whether a journal filter is active', () => {
    expect(hasActiveJournalFilters(JOURNAL_DEFAULT_FILTERS)).toBe(false);
    expect(
      hasActiveJournalFilters({ ...JOURNAL_DEFAULT_FILTERS, date: 'this_year' }),
    ).toBe(true);
  });

  it('sorts entries by rating, title, and recent activity without mutating input', () => {
    const entries = [
      makeEntry({ id: 'unrated', lastActivityAt: '2026-07-15T10:00:00.000Z', rating: null, title: 'Zeta' }),
      makeEntry({ id: 'lower-rated', lastActivityAt: '2026-07-14T10:00:00.000Z', rating: 3, title: 'Beta' }),
      makeEntry({ id: 'higher-rated', lastActivityAt: '2026-07-13T10:00:00.000Z', rating: 5, title: 'Alpha' }),
    ];
    const originalOrder = entries.map((entry) => entry.id);

    expect(sortJournalEntries(entries, 'rating').map((entry) => entry.id)).toEqual([
      'higher-rated',
      'lower-rated',
      'unrated',
    ]);
    expect(sortJournalEntries(entries, 'title').map((entry) => entry.id)).toEqual([
      'higher-rated',
      'lower-rated',
      'unrated',
    ]);
    expect(sortJournalEntries(entries, 'recent_activity').map((entry) => entry.id)).toEqual([
      'unrated',
      'lower-rated',
      'higher-rated',
    ]);
    expect(entries.map((entry) => entry.id)).toEqual(originalOrder);
  });

  it('groups timeline entries by the active timeline date', () => {
    const entries = [
      makeEntry({ id: 'march', lastActivityAt: '2026-03-05T10:00:00.000Z' }),
      makeEntry({ id: 'february-a', lastActivityAt: '2026-02-20T10:00:00.000Z' }),
      makeEntry({ id: 'february-b', lastActivityAt: '2026-02-10T10:00:00.000Z' }),
    ];

    expect(getJournalTimelineGroups(entries, 'recent_activity')).toEqual([
      {
        entries: [entries[0]],
        key: '2026-03',
        title: 'March 2026',
      },
      {
        entries: [entries[1], entries[2]],
        key: '2026-02',
        title: 'February 2026',
      },
    ]);
  });
});

describe('journal calendar model', () => {
  it('normalizes and moves calendar months across year boundaries', () => {
    expect(getJournalCalendarMonthDate('2024-03-17T10:00:00.000Z')).toBe(
      '2024-03-01',
    );
    expect(addJournalCalendarMonths('2024-12-01', 1)).toBe('2025-01-01');
    expect(addJournalCalendarMonths('2025-01-01', -1)).toBe('2024-12-01');
  });

  it('builds a six-week month grid and summaries from entry creation dates', () => {
    const entries = [
      makeEntry({
        id: 'march-10-movie',
        createdAt: '2024-03-10T10:00:00.000Z',
        lastActivityAt: '2024-04-01T10:00:00.000Z',
        mediaType: 'movie',
        rating: 4,
      }),
      makeEntry({
        id: 'march-10-series',
        createdAt: '2024-03-10T11:00:00.000Z',
        mediaType: 'series',
        rating: 2,
      }),
      makeEntry({
        id: 'march-20-anime',
        createdAt: '2024-03-20T10:00:00.000Z',
        mediaType: 'anime',
        rating: 3,
      }),
    ];
    const calendar = getJournalCalendarMonth(entries, '2024-03-17');
    const march10 = calendar.days.find((day) => day.date === '2024-03-10');
    const march20 = calendar.days.find((day) => day.date === '2024-03-20');

    expect(calendar.days).toHaveLength(42);
    expect(calendar.monthDate).toBe('2024-03-01');
    expect(calendar.totalEntries).toBe(3);
    expect(calendar.activeDayCount).toBe(2);
    expect(calendar.averageRating).toBe(3);
    expect(calendar.bestDay).toBe('2024-03-10');
    expect(calendar.maxEntriesInDay).toBe(2);
    expect(march10).toMatchObject({
      activityLevel: 3,
      entryCount: 2,
      mediaTypes: ['movie', 'series'],
    });
    expect(march20).toMatchObject({
      activityLevel: 2,
      entryCount: 1,
      mediaTypes: ['anime'],
    });
  });

  it('returns empty summaries when a month has no entries', () => {
    const calendar = getJournalCalendarMonth([], '2024-03-01');

    expect(calendar).toMatchObject({
      activeDayCount: 0,
      averageRating: null,
      bestDay: null,
      maxEntriesInDay: 0,
      totalEntries: 0,
    });
  });

  it('rejects impossible calendar dates', () => {
    expect(() => getJournalCalendarMonthDate('2024-02-31')).toThrow(
      'Invalid journal calendar date',
    );
  });
});
