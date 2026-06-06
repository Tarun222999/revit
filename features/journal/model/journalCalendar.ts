import { MEDIA_TYPES } from '@/constants/media';
import type {
  JournalCalendarActivityLevel,
  JournalCalendarDay,
  JournalCalendarMonth,
  JournalListEntry,
} from '@/features/journal/types';

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const CALENDAR_GRID_DAY_COUNT = 42;
const CALENDAR_MONTH_KEY_LENGTH = 7;
const CALENDAR_MONTH_START_DAY = 1;
const CALENDAR_WEEK_START_OFFSET = 0;
const AVERAGE_RATING_PRECISION = 10;
const HIGH_ACTIVITY_RATIO = 2 / 3;
const MEDIUM_ACTIVITY_RATIO = 1 / 3;

function padDatePart(value: number) {
  return value.toString().padStart(2, '0');
}

function formatUtcDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join('-');
}

function parseDateKey(value: string) {
  const match = CALENDAR_DATE_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Invalid journal calendar date: ${value}`);
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;
  const day = Number(dayValue);
  const date = new Date(Date.UTC(year, monthIndex, day));
  const dateKey = `${yearValue}-${monthValue}-${dayValue}`;

  if (formatUtcDateKey(date) !== dateKey) {
    throw new Error(`Invalid journal calendar date: ${value}`);
  }

  return {
    dateKey,
    day,
    monthIndex,
    year,
  };
}

function addDays(dateKey: string, dayOffset: number) {
  const { day, monthIndex, year } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, monthIndex, day + dayOffset));

  return formatUtcDateKey(date);
}

function getMonthKey(dateKey: string) {
  return dateKey.slice(0, CALENDAR_MONTH_KEY_LENGTH);
}

function getMonthStartOffset(year: number, monthIndex: number) {
  const firstDay = new Date(
    Date.UTC(year, monthIndex, CALENDAR_MONTH_START_DAY),
  ).getUTCDay();

  return (firstDay - CALENDAR_WEEK_START_OFFSET + 7) % 7;
}

function getEntryCreatedDate(entry: JournalListEntry) {
  return parseDateKey(entry.createdAt).dateKey;
}

function sortEntriesByCreatedAt(entries: JournalListEntry[]) {
  return [...entries].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) ||
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

function groupEntriesByCreatedDate(entries: JournalListEntry[]) {
  const groupedEntries = new Map<string, JournalListEntry[]>();

  entries.forEach((entry) => {
    const dateKey = getEntryCreatedDate(entry);
    const dateEntries = groupedEntries.get(dateKey) ?? [];

    dateEntries.push(entry);
    groupedEntries.set(dateKey, dateEntries);
  });

  groupedEntries.forEach((dateEntries, dateKey) => {
    groupedEntries.set(dateKey, sortEntriesByCreatedAt(dateEntries));
  });

  return groupedEntries;
}

function getMediaTypes(entries: JournalListEntry[]) {
  const mediaTypes = new Set(entries.map((entry) => entry.mediaType));

  return MEDIA_TYPES.filter((mediaType) => mediaTypes.has(mediaType));
}

function getActivityLevel(
  entryCount: number,
  maxEntriesInDay: number,
): JournalCalendarActivityLevel {
  if (entryCount === 0 || maxEntriesInDay === 0) {
    return 0;
  }

  if (maxEntriesInDay === 1) {
    return 1;
  }

  const activityRatio = entryCount / maxEntriesInDay;

  if (activityRatio >= HIGH_ACTIVITY_RATIO) {
    return 3;
  }

  if (activityRatio >= MEDIUM_ACTIVITY_RATIO) {
    return 2;
  }

  return 1;
}

function getAverageRating(entries: JournalListEntry[]) {
  const ratedEntries = entries.filter((entry) => entry.rating != null);

  if (ratedEntries.length === 0) {
    return null;
  }

  const ratingTotal = ratedEntries.reduce(
    (total, entry) => total + (entry.rating ?? 0),
    0,
  );

  return (
    Math.round((ratingTotal / ratedEntries.length) * AVERAGE_RATING_PRECISION) /
    AVERAGE_RATING_PRECISION
  );
}

function getBestDay(days: JournalCalendarDay[]) {
  const activeDays = days.filter(
    (day) => day.isCurrentMonth && day.entryCount > 0,
  );

  if (activeDays.length === 0) {
    return null;
  }

  return activeDays.reduce((bestDay, day) =>
    day.entryCount > bestDay.entryCount ? day : bestDay,
  ).date;
}

function getCurrentMonthEntries(entries: JournalListEntry[], monthKey: string) {
  return entries.filter(
    (entry) => getMonthKey(getEntryCreatedDate(entry)) === monthKey,
  );
}

function getMaxCurrentMonthEntriesInDay(
  entriesByDate: Map<string, JournalListEntry[]>,
  monthKey: string,
) {
  return Array.from(entriesByDate.entries()).reduce(
    (maxCount, [date, dateEntries]) =>
      getMonthKey(date) === monthKey
        ? Math.max(maxCount, dateEntries.length)
        : maxCount,
    0,
  );
}

/**
 * Converts any journal timestamp or date key into the month key used by the
 * calendar model.
 *
 * @param date - A journal timestamp or ISO date string.
 * @returns The first day of that calendar month as `YYYY-MM-01`.
 */
export function getJournalCalendarMonthDate(date: string) {
  const { dateKey } = parseDateKey(date);

  return `${getMonthKey(dateKey)}-01`;
}

/**
 * Builds a month grid and summary values from already-filtered journal entries.
 *
 * Calendar activity is intentionally based on `JournalListEntry.createdAt`,
 * matching the v1 created-date contract.
 *
 * @param entries - Filtered journal entries for the Calendar view.
 * @param monthDate - Any date inside the month to model.
 * @returns A six-week calendar grid plus current-month summary values.
 */
export function getJournalCalendarMonth(
  entries: JournalListEntry[],
  monthDate: string,
): JournalCalendarMonth {
  const normalizedMonthDate = getJournalCalendarMonthDate(monthDate);
  const monthKey = getMonthKey(normalizedMonthDate);
  const { monthIndex, year } = parseDateKey(normalizedMonthDate);
  const startOffset = getMonthStartOffset(year, monthIndex);
  const firstGridDate = addDays(normalizedMonthDate, -startOffset);
  const entriesByDate = groupEntriesByCreatedDate(entries);
  const currentMonthEntries = sortEntriesByCreatedAt(
    getCurrentMonthEntries(entries, monthKey),
  );
  const maxEntriesInDay = getMaxCurrentMonthEntriesInDay(
    entriesByDate,
    monthKey,
  );

  const days = Array.from({ length: CALENDAR_GRID_DAY_COUNT }).map(
    (_, dayIndex) => {
      const date = addDays(firstGridDate, dayIndex);
      const isCurrentMonth = getMonthKey(date) === monthKey;
      const dayEntries = isCurrentMonth ? (entriesByDate.get(date) ?? []) : [];

      return {
        activityLevel: getActivityLevel(dayEntries.length, maxEntriesInDay),
        date,
        entries: dayEntries,
        entryCount: dayEntries.length,
        isCurrentMonth,
        mediaTypes: getMediaTypes(dayEntries),
      };
    },
  );

  return {
    activeDayCount: days.filter(
      (day) => day.isCurrentMonth && day.entryCount > 0,
    ).length,
    averageRating: getAverageRating(currentMonthEntries),
    bestDay: getBestDay(days),
    days,
    maxEntriesInDay,
    monthDate: normalizedMonthDate,
    totalEntries: currentMonthEntries.length,
  };
}
