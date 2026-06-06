import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { JournalCalendarMonth } from '@/features/journal/types';

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

/**
 * Renders the first Calendar view shell using the Phase 5.1 calendar month
 * model before the full grid is introduced.
 *
 * @param month - Calendar month model derived from filtered journal entries.
 * @returns A month summary surface for the active Calendar view.
 */
export function JournalCalendarView({ month }: { month: JournalCalendarMonth }) {
  return (
    <Card className="gap-4">
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase text-gold-300">
          Calendar
        </Text>
        <Text className="text-2xl font-bold text-archive-50">
          {formatMonthTitle(month.monthDate)}
        </Text>
      </View>

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
  );
}
