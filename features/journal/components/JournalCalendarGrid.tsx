import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { JournalCalendarDay } from '@/features/journal/types';
import { cn } from '@/lib/utils/cn';

type JournalCalendarGridProps = {
  days: JournalCalendarDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_CELL_STYLE: ViewStyle = {
  width: `${100 / WEEKDAY_LABELS.length}%` as `${number}%`,
};
const MAX_VISIBLE_MEDIA_MARKERS = 3;

const ACTIVITY_CELL_CLASSES: Record<JournalCalendarDay['activityLevel'], string> = {
  0: '',
  1: 'border-shelf-500 bg-archive-800',
  2: 'border-gold-500 bg-shelf-700',
  3: 'border-gold-300 bg-gold-500',
};

const ACTIVITY_TEXT_CLASSES: Record<JournalCalendarDay['activityLevel'], string> = {
  0: '',
  1: 'text-gold-300',
  2: 'text-archive-50',
  3: 'text-archive-900',
};

const MEDIA_MARKER_CLASSES = {
  anime: 'bg-reel-400',
  game: 'bg-shelf-300',
  movie: 'bg-gold-300',
  series: 'bg-teal-300',
} satisfies Record<JournalCalendarDay['mediaTypes'][number], string>;

function getDayNumber(date: string) {
  return String(Number(date.slice(-2)));
}

function getAccessibilityLabel(day: JournalCalendarDay) {
  if (day.entryCount === 0) {
    return day.date;
  }

  const mediaLabel = day.mediaTypes
    .map((mediaType) => MEDIA_TYPE_LABELS[mediaType])
    .join(', ');
  const entryLabel = day.entryCount === 1 ? 'entry' : 'entries';

  return `${day.date}, ${day.entryCount} ${entryLabel}${mediaLabel ? `, ${mediaLabel}` : ''}`;
}

function MediaTypeMarkers({ day }: { day: JournalCalendarDay }) {
  if (day.mediaTypes.length === 0) {
    return <View className="h-2" />;
  }

  const visibleMarkers = day.mediaTypes.slice(0, MAX_VISIBLE_MEDIA_MARKERS);
  const extraMarkerCount = day.mediaTypes.length - visibleMarkers.length;

  return (
    <View className="mt-1 h-2 flex-row items-center justify-center gap-0.5">
      {visibleMarkers.map((mediaType) => (
        <View
          className={cn('h-1.5 w-1.5 rounded-full', MEDIA_MARKER_CLASSES[mediaType])}
          key={mediaType}
        />
      ))}

      {extraMarkerCount > 0 ? (
        <Text className="text-[8px] font-black leading-none text-archive-100">
          +
        </Text>
      ) : null}
    </View>
  );
}

function CalendarDayCell({
  day,
  selected,
  onSelectDate,
}: {
  day: JournalCalendarDay;
  selected: boolean;
  onSelectDate: (date: string) => void;
}) {
  const active = day.entryCount > 0;
  const activityCellClass = ACTIVITY_CELL_CLASSES[day.activityLevel];
  const activityTextClass = ACTIVITY_TEXT_CLASSES[day.activityLevel];

  return (
    <View className="p-0.5" style={CALENDAR_CELL_STYLE}>
      <Pressable
        accessibilityLabel={getAccessibilityLabel(day)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !day.isCurrentMonth, selected }}
        disabled={!day.isCurrentMonth}
        onPress={() => onSelectDate(day.date)}
        className={cn(
          'aspect-square min-h-12 items-center justify-center rounded-md border px-0.5 py-1',
          day.isCurrentMonth
            ? 'border-archive-700 bg-archive-900'
            : 'border-transparent bg-transparent',
          active && activityCellClass,
          selected && 'border-gold-300 bg-gold-400',
        )}>
        <Text
          className={cn(
            'text-xs font-bold leading-none',
            day.isCurrentMonth ? 'text-archive-100' : 'text-archive-600',
            active && activityTextClass,
            selected && 'text-archive-900',
          )}>
          {getDayNumber(day.date)}
        </Text>

        <MediaTypeMarkers day={day} />

        {active ? (
          <View
            className={cn(
              'mt-1 min-w-5 rounded-full px-1',
              selected ? 'bg-archive-900' : 'bg-gold-400',
              day.activityLevel === 3 && !selected && 'bg-archive-900',
            )}>
            <Text
              className={cn(
                'text-center text-[10px] font-bold',
                selected ? 'text-gold-300' : 'text-archive-900',
                day.activityLevel === 3 && !selected && 'text-gold-300',
              )}>
              {day.entryCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/**
 * Renders a six-week journal calendar grid with selectable days.
 *
 * @param days - Calendar day models for the active month grid.
 * @param selectedDate - Currently selected date key.
 * @param onSelectDate - Called when a calendar date is selected.
 * @returns The calendar weekday row and day cells.
 */
export function JournalCalendarGrid({
  days,
  selectedDate,
  onSelectDate,
}: JournalCalendarGridProps) {
  return (
    <View className="gap-2">
      <View className="flex-row">
        {WEEKDAY_LABELS.map((weekday) => (
          <View key={weekday} style={CALENDAR_CELL_STYLE}>
            <Text className="text-center text-[10px] font-bold uppercase text-archive-400">
              {weekday}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day) => (
          <CalendarDayCell
            day={day}
            key={day.date}
            selected={selectedDate === day.date}
            onSelectDate={onSelectDate}
          />
        ))}
      </View>
    </View>
  );
}
