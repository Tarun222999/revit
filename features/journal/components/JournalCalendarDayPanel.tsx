import { Text, View } from 'react-native';

import { JournalEntryCard } from '@/features/journal/components/JournalEntryCard';
import type {
  JournalCalendarDay,
  JournalListEntry,
  JournalSort,
} from '@/features/journal/types';

type JournalCalendarDayPanelProps = {
  day: JournalCalendarDay;
  onEntryPress: (entry: JournalListEntry) => void;
};

const CALENDAR_PANEL_LOCALE = 'en';
const CALENDAR_PANEL_ENTRY_SORT: JournalSort = 'recently_added';

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatSelectedDate(date: string) {
  return new Intl.DateTimeFormat(CALENDAR_PANEL_LOCALE, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    weekday: 'long',
  }).format(toUtcDate(date));
}

function getEntryCountLabel(entryCount: number) {
  return entryCount === 1 ? '1 entry' : `${entryCount} entries`;
}

/**
 * Renders the selected Calendar day entries below the month grid.
 *
 * @param day - Selected day model from the active calendar month.
 * @param onEntryPress - Opens Title Details for a selected-day entry.
 * @returns The selected day entry list or a calm empty state.
 */
export function JournalCalendarDayPanel({
  day,
  onEntryPress,
}: JournalCalendarDayPanelProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-bold uppercase text-gold-300">
            Selected day
          </Text>
          <Text className="text-lg font-bold text-archive-50">
            {formatSelectedDate(day.date)}
          </Text>
        </View>

        <View className="rounded-full border border-archive-700 px-3 py-1">
          <Text className="text-xs font-bold text-archive-200">
            {getEntryCountLabel(day.entryCount)}
          </Text>
        </View>
      </View>

      {day.entries.length > 0 ? (
        <View className="gap-3">
          {day.entries.map((entry) => (
            <JournalEntryCard
              entry={entry}
              key={entry.id}
              sort={CALENDAR_PANEL_ENTRY_SORT}
              onPress={() => onEntryPress(entry)}
            />
          ))}
        </View>
      ) : (
        <View className="rounded-app border border-dashed border-archive-700 bg-archive-800 p-4">
          <Text className="text-sm leading-5 text-archive-300">
            No entries were created on this date. Pick an active day to review
            what you logged then.
          </Text>
        </View>
      )}
    </View>
  );
}
