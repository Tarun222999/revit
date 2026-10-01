import {
  DEFAULT_TIMELINE_FILTERS,
  filterJournalTimeline,
  hasActiveTimelineFilters,
} from '../features/journal/model/journalTimeline';
import type { JournalTimelineItem } from '../features/journal/types';

const items: JournalTimelineItem[] = [
  {
    currentStatus: 'completed',
    event: {
      eventDate: '2026-07-29',
      id: 'event-2',
      journalEntryId: 'entry-1',
      notes: 'Even better the second time.',
      rating: 4.5,
      type: 'completed',
    },
    isRewatch: true,
    media: {
      id: 'media-1',
      imageUrl: null,
      mediaType: 'movie',
      originalTitle: null,
      releaseDate: '2025-01-01',
      source: 'tmdb',
      sourceId: '101',
      title: 'Second Look',
      year: '2025',
    },
  },
  {
    currentStatus: 'in_progress',
    event: {
      eventDate: '2026-07-20',
      id: 'event-1',
      journalEntryId: 'entry-2',
      notes: null,
      rating: null,
      type: 'started',
    },
    isRewatch: false,
    media: {
      id: 'media-2',
      imageUrl: null,
      mediaType: 'series',
      originalTitle: null,
      releaseDate: '2024-01-01',
      source: 'tmdb',
      sourceId: '202',
      title: 'Long Story',
      year: '2024',
    },
  },
];

describe('event Timeline filters', () => {
  it('preserves chronological source order while filtering', () => {
    expect(
      filterJournalTimeline(items, {
        ...DEFAULT_TIMELINE_FILTERS,
        eventTypes: ['completed'],
        mediaType: 'movie',
        rating: 'gte_4',
      }),
    ).toEqual([items[0]]);
  });

  it('searches titles and applies user-date ranges', () => {
    expect(
      filterJournalTimeline(
        items,
        { ...DEFAULT_TIMELINE_FILTERS, date: 'last_30_days', query: 'story' },
        '2026-08-10',
      ),
    ).toEqual([items[1]]);
  });

  it('recognizes and clears active filters without a sort mode', () => {
    expect(hasActiveTimelineFilters(DEFAULT_TIMELINE_FILTERS)).toBe(false);
    expect(
      hasActiveTimelineFilters({ ...DEFAULT_TIMELINE_FILTERS, query: 'look' }),
    ).toBe(true);
    expect(DEFAULT_TIMELINE_FILTERS).not.toHaveProperty('sort');
  });
});
