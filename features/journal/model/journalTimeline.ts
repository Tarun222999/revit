import type {
  JournalTimelineFilters,
  JournalTimelineItem,
} from '@/features/journal/types';
import { localToday } from '@/features/journal/model/journalIntentForm';

export const DEFAULT_TIMELINE_FILTERS: JournalTimelineFilters = {
  date: 'all',
  eventTypes: [],
  mediaType: 'all',
  query: '',
  rating: 'any',
};

function daysBefore(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  value.setDate(value.getDate() - days);
  return localToday(value);
}

function dateStart(filter: JournalTimelineFilters['date'], today: string) {
  if (filter === 'all') return null;
  if (filter === 'last_30_days') return daysBefore(today, 29);
  if (filter === 'this_month') return `${today.slice(0, 7)}-01`;
  return `${today.slice(0, 4)}-01-01`;
}

function matchesRating(item: JournalTimelineItem, rating: JournalTimelineFilters['rating']) {
  const value = item.event.rating;
  if (rating === 'any') return true;
  if (rating === 'rated') return value != null;
  if (rating === 'unrated') return value == null;
  if (rating === 'gte_4') return value != null && value >= 4;
  return value != null && value >= 3;
}

export function filterJournalTimeline(
  items: JournalTimelineItem[],
  filters: JournalTimelineFilters,
  today = localToday(),
) {
  const query = filters.query.trim().toLocaleLowerCase();
  const start = dateStart(filters.date, today);
  return items.filter((item) => {
    return (
      (!query || item.media.title.toLocaleLowerCase().includes(query)) &&
      (filters.mediaType === 'all' || item.media.mediaType === filters.mediaType) &&
      (filters.eventTypes.length === 0 || filters.eventTypes.includes(item.event.type)) &&
      matchesRating(item, filters.rating) &&
      (!start || item.event.eventDate >= start)
    );
  });
}

export function hasActiveTimelineFilters(filters: JournalTimelineFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.mediaType !== 'all' ||
    filters.eventTypes.length > 0 ||
    filters.rating !== 'any' ||
    filters.date !== 'all'
  );
}
