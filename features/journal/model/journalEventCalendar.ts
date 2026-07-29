import type {
  JournalCalendarData,
  JournalEventCalendarMonth,
} from '@/features/journal/types';
import { addJournalCalendarMonths, getJournalCalendarMonthDate } from '@/features/journal/model/journalCalendar';

const GRID_DAY_COUNT = 42;

function parse(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function key(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(value: string, amount: number) {
  const date = parse(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return key(date);
}

export function getJournalEventCalendarRange(monthDate: string) {
  const normalized = getJournalCalendarMonthDate(monthDate);
  const first = parse(normalized);
  const startDate = addDays(normalized, -first.getUTCDay());
  return {
    endDate: addDays(startDate, GRID_DAY_COUNT - 1),
    startDate,
  };
}

export function buildJournalEventCalendarMonth(
  monthDate: string,
  data: JournalCalendarData,
): JournalEventCalendarMonth {
  const normalized = getJournalCalendarMonthDate(monthDate);
  const monthKey = normalized.slice(0, 7);
  const expectedRange = getJournalEventCalendarRange(normalized);
  const eventsByDate = new Map<string, JournalCalendarData['events']>();
  const plansByDate = new Map<string, JournalCalendarData['plans']>();

  for (const event of data.events) {
    const values = eventsByDate.get(event.event.eventDate) ?? [];
    values.push(event);
    eventsByDate.set(event.event.eventDate, values);
  }
  for (const plan of data.plans) {
    const values = plansByDate.get(plan.plannedFor) ?? [];
    values.push(plan);
    plansByDate.set(plan.plannedFor, values);
  }

  const days = Array.from({ length: GRID_DAY_COUNT }, (_, index) => {
    const date = addDays(expectedRange.startDate, index);
    return {
      date,
      events: eventsByDate.get(date) ?? [],
      isCurrentMonth: date.startsWith(monthKey),
      plans: plansByDate.get(date) ?? [],
    };
  });
  const monthEvents = data.events.filter((item) => item.event.eventDate.startsWith(monthKey));
  const monthPlans = data.plans.filter((item) => item.plannedFor.startsWith(monthKey));

  return {
    ...expectedRange,
    completedCount: monthEvents.filter((item) => item.event.type === 'completed').length,
    days,
    eventCount: monthEvents.length,
    monthDate: normalized,
    planCount: monthPlans.length,
  };
}

export function calendarSelectionForMonth(monthDate: string, today: string) {
  const normalized = getJournalCalendarMonthDate(monthDate);
  return normalized.slice(0, 7) === today.slice(0, 7) ? today : normalized;
}

export function monthForSelectedCalendarDate(selectedDate: string) {
  return getJournalCalendarMonthDate(selectedDate);
}

export { addJournalCalendarMonths };
