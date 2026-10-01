import {
  buildJournalEventCalendarMonth,
  calendarSelectionForMonth,
  getJournalEventCalendarRange,
} from '../features/journal/model/journalEventCalendar';
import type { JournalCalendarData } from '../features/journal/types';

const media = {
  id: 'media-1',
  imageUrl: null,
  mediaType: 'movie' as const,
  originalTitle: null,
  releaseDate: null,
  source: 'tmdb' as const,
  sourceId: '1',
  title: 'Same Day',
  year: null,
};

describe('event and plan Calendar', () => {
  it('builds a six-week range including adjacent-month dates', () => {
    expect(getJournalEventCalendarRange('2026-07-01')).toEqual({
      endDate: '2026-08-08',
      startDate: '2026-06-28',
    });
  });

  it('keeps logged events and plans separate on a mixed day', () => {
    const data: JournalCalendarData = {
      endDate: '2026-08-08',
      events: [
        {
          event: {
            eventDate: '2026-07-30',
            id: 'event-1',
            journalEntryId: 'entry-1',
            notes: null,
            rating: 4,
            type: 'completed',
          },
          media,
        },
      ],
      plans: [{ journalEntryId: 'entry-2', media, plannedFor: '2026-07-30' }],
      startDate: '2026-06-28',
    };
    const month = buildJournalEventCalendarMonth('2026-07-01', data);
    const day = month.days.find((value) => value.date === '2026-07-30');

    expect(day?.events).toHaveLength(1);
    expect(day?.plans).toHaveLength(1);
    expect(month.completedCount).toBe(1);
    expect(month.planCount).toBe(1);
  });

  it('defaults current month selection to the explicit local today', () => {
    expect(calendarSelectionForMonth('2026-07-01', '2026-07-29')).toBe('2026-07-29');
    expect(calendarSelectionForMonth('2026-08-01', '2026-07-29')).toBe('2026-08-01');
  });

  it('does not derive date-only values from timestamps near midnight', () => {
    const data: JournalCalendarData = {
      endDate: '2026-08-08',
      events: [
        {
          event: {
            eventDate: '2026-07-01',
            id: 'event-midnight',
            journalEntryId: 'entry-1',
            notes: null,
            rating: null,
            type: 'started',
          },
          media,
        },
      ],
      plans: [],
      startDate: '2026-06-28',
    };
    const month = buildJournalEventCalendarMonth('2026-07-01', data);
    expect(month.days.find((day) => day.date === '2026-07-01')?.events[0].event.id).toBe(
      'event-midnight',
    );
  });
});
