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
  return averageRating == null ? 'No ratings' : `${averageRating.toFixed(1)}/5`;
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
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="min-h-20 flex-1 justify-between rounded-app border border-archive-700 bg-archive-900 p-3">
      <Text className="text-xs font-bold uppercase text-archive-300">
        {label}
      </Text>
      <Text className="text-xl font-bold text-archive-50">{value}</Text>
    </View>
  );
}

function MonthNavButton({
  direction,
  label,
  onPress,
}: {
  direction: 'back' | 'forward';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full border border-archive-700 bg-archive-900">
      <Ionicons
        color="#fbf6ec"
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
 * @param onNextMonth - Moves the calendar to the next month.
 * @param onEntryPress - Opens Title Details for a selected-day entry.
 * @param onPreviousMonth - Moves the calendar to the previous month.
 * @returns A month summary surface for the active Calendar view.
 */
export function JournalCalendarView({
  month,
  onEntryPress,
  onNextMonth,
  onPreviousMonth,
}: {
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

        <View className="flex-row gap-2">
          <CalendarSummaryTile
            label="Entries"
            value={String(month.totalEntries)}
          />
          <CalendarSummaryTile
            label="Active days"
            value={String(month.activeDayCount)}
          />
        </View>

        <View className="flex-row gap-2">
          <CalendarSummaryTile
            label="Best day"
            value={month.bestDay ? formatDayLabel(month.bestDay) : 'None'}
          />
          <CalendarSummaryTile
            label="Avg rating"
            value={formatAverageRating(month.averageRating)}
          />
        </View>
      </Card>

      <JournalCalendarDayPanel day={selectedDay} onEntryPress={onEntryPress} />
    </View>
  );
}
