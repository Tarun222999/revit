import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { JournalCalendarDayPanel } from '@/features/journal/components/JournalCalendarDayPanel';
import { JournalCalendarGrid } from '@/features/journal/components/JournalCalendarGrid';
import type {
  JournalCalendarMonth,
  JournalListEntry,
} from '@/features/journal/types';

const CALENDAR_SUMMARY_LOCALE = 'en';

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatMonthTitle(monthDate: string) {
  return new Intl.DateTimeFormat(CALENDAR_SUMMARY_LOCALE, {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(toUtcDate(monthDate));
}

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat(CALENDAR_SUMMARY_LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toUtcDate(date));
}

function formatAverageRating(averageRating: number | null) {
  return averageRating == null ? 'Unrated' : `${averageRating.toFixed(1)}/5`;
}

function formatTotalEntries(totalEntries: number) {
  return totalEntries === 1 ? '1 entry' : `${totalEntries} entries`;
}

function formatActiveDayCount(activeDayCount: number) {
  return activeDayCount === 1 ? '1 day' : `${activeDayCount} days`;
}

function getInitialSelectedDate(month: JournalCalendarMonth) {
  return month.bestDay ?? month.monthDate;
}

function getSelectedDay(month: JournalCalendarMonth, selectedDate: string) {
  const selectedDay =
    month.days.find((day) => day.date === selectedDate && day.isCurrentMonth) ??
    month.days.find((day) => day.date === getInitialSelectedDate(month)) ??
    month.days.find((day) => day.date === month.monthDate);

  if (!selectedDay) {
    throw new Error(`Calendar month ${month.monthDate} has no day models.`);
  }

  return selectedDay;
}

function CalendarSummaryTile({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <View className="min-h-24 flex-1 justify-between rounded-app border border-archive-700 bg-archive-900 p-3">
      <Text className="text-xs font-bold uppercase text-archive-300">
        {label}
      </Text>
      <View className="gap-1">
        <Text className="text-lg font-bold text-archive-50">{value}</Text>
        <Text className="text-xs leading-4 text-archive-400">{detail}</Text>
      </View>
    </View>
  );
}

function NoActivityMonthNotice() {
  return (
    <View className="rounded-app border border-dashed border-archive-700 bg-archive-800 p-4">
      <Text className="text-sm font-bold text-archive-100">
        No activity this month
      </Text>
      <Text className="mt-1 text-sm leading-5 text-archive-300">
        The calendar is still showing the full month. Move to another month or
        adjust the current filters to find logged entries.
      </Text>
    </View>
  );
}

function MonthNavButton({
  disabled = false,
  direction,
  label,
  onPress,
}: {
  disabled?: boolean;
  direction: 'back' | 'forward';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-full border border-archive-700 bg-archive-900 ${
        disabled ? 'opacity-40' : ''
      }`}>
      <Ionicons
        color={disabled ? '#6d583e' : '#fbf6ec'}
        name={direction === 'back' ? 'chevron-back' : 'chevron-forward'}
        size={18}
      />
    </Pressable>
  );
}

/**
 * Renders the Calendar month grid, month summary, and selected-day entry panel.
 *
 * @param month - Calendar month model derived from filtered journal entries.
 * @param disableNextMonth - Whether future month navigation should be disabled.
 * @param onNextMonth - Moves the calendar to the next month.
 * @param onEntryPress - Opens Title Details for a selected-day entry.
 * @param onPreviousMonth - Moves the calendar to the previous month.
 * @returns A month summary surface for the active Calendar view.
 */
export function JournalCalendarView({
  disableNextMonth,
  month,
  onEntryPress,
  onNextMonth,
  onPreviousMonth,
}: {
  disableNextMonth: boolean;
  month: JournalCalendarMonth;
  onEntryPress: (entry: JournalListEntry) => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() =>
    getInitialSelectedDate(month),
  );
  const selectedDay = getSelectedDay(month, selectedDate);

  useEffect(() => {
    const selectedDay = month.days.find((day) => day.date === selectedDate);

    if (!selectedDay?.isCurrentMonth) {
      setSelectedDate(getInitialSelectedDate(month));
    }
  }, [month, selectedDate]);

  return (
    <View className="gap-4">
      <Card className="gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <MonthNavButton
            direction="back"
            label="Previous month"
            onPress={onPreviousMonth}
          />

          <View className="min-w-0 flex-1 items-center gap-1">
            <Text className="text-xs font-bold uppercase text-gold-300">
              Calendar
            </Text>
            <Text className="text-center text-2xl font-bold text-archive-50">
              {formatMonthTitle(month.monthDate)}
            </Text>
          </View>

          <MonthNavButton
            disabled={disableNextMonth}
            direction="forward"
            label="Next month"
            onPress={onNextMonth}
          />
        </View>

        <JournalCalendarGrid
          days={month.days}
          selectedDate={selectedDay.date}
          onSelectDate={setSelectedDate}
        />

        <View className="gap-2">
          <Text className="text-xs font-bold uppercase text-archive-300">
            Month summary
          </Text>

          <View className="flex-row gap-2">
            <CalendarSummaryTile
              detail="Created in this month"
              label="Entries"
              value={formatTotalEntries(month.totalEntries)}
            />
            <CalendarSummaryTile
              detail="Days with activity"
              label="Active days"
              value={formatActiveDayCount(month.activeDayCount)}
            />
          </View>
        </View>

        <View className="flex-row gap-2">
          <CalendarSummaryTile
            detail="Most entries in a day"
            label="Best day"
            value={month.bestDay ? formatDayLabel(month.bestDay) : 'No activity'}
          />
          <CalendarSummaryTile
            detail="Rated entries only"
            label="Avg rating"
            value={formatAverageRating(month.averageRating)}
          />
        </View>

        {month.totalEntries === 0 ? <NoActivityMonthNotice /> : null}
      </Card>

      <JournalCalendarDayPanel day={selectedDay} onEntryPress={onEntryPress} />
    </View>
  );
}
