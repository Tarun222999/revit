import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { MediaPoster } from '@/components/media/MediaPoster';
import { Card } from '@/components/ui/Card';
import { useJournalCalendarRange } from '@/features/journal/hooks/useJournalReads';
import {
  addJournalCalendarMonths,
  buildJournalEventCalendarMonth,
  calendarSelectionForMonth,
  getJournalEventCalendarRange,
  monthForSelectedCalendarDate,
} from '@/features/journal/model/journalEventCalendar';
import { localToday } from '@/features/journal/model/journalIntentForm';
import type {
  JournalCalendarEventItem,
  JournalCalendarPlanItem,
  JournalEventCalendarDay,
} from '@/features/journal/types';
import { createMediaRouteId } from '@/features/media/api/media-api';
import { cn } from '@/lib/utils/cn';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_STYLE: ViewStyle = { width: `${100 / 7}%` as `${number}%` };

function displayDate(value: string, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
}

function openMedia(media: JournalCalendarEventItem['media'] | JournalCalendarPlanItem['media']) {
  const routeId = createMediaRouteId({ id: media.id, source: media.source, sourceId: media.sourceId });
  router.push(`/title/${encodeURIComponent(routeId)}`);
}

function CalendarCell({
  day,
  onSelect,
  selected,
}: {
  day: JournalEventCalendarDay;
  onSelect: (date: string) => void;
  selected: boolean;
}) {
  const eventCount = day.events.length;
  const planCount = day.plans.length;
  const label = `${day.date}, ${eventCount} logged ${eventCount === 1 ? 'event' : 'events'}, ${planCount} ${planCount === 1 ? 'plan' : 'plans'}`;
  return (
    <View className="p-0.5" style={CELL_STYLE}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        className={cn(
          'aspect-square min-h-12 items-center justify-center rounded-md border p-1',
          day.isCurrentMonth
            ? 'border-archive-700 bg-archive-900'
            : 'border-transparent bg-archive-900/40',
          selected && 'border-gold-300 bg-gold-400',
        )}
        onPress={() => onSelect(day.date)}>
        <Text
          className={cn(
            'text-xs font-bold',
            day.isCurrentMonth ? 'text-archive-100' : 'text-archive-500',
            selected && 'text-archive-900',
          )}>
          {Number(day.date.slice(-2))}
        </Text>
        <View className="mt-1 h-4 flex-row items-center justify-center gap-1">
          {eventCount ? (
            <Ionicons
              accessibilityLabel="Logged activity marker"
              color={selected ? '#0d0b09' : '#4fd1c5'}
              name="ellipse"
              size={8}
            />
          ) : null}
          {planCount ? (
            <Ionicons
              accessibilityLabel="Planned marker"
              color={selected ? '#0d0b09' : '#f4c95d'}
              name="calendar"
              size={11}
            />
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function MonthButton({ direction, onPress }: { direction: 'back' | 'forward'; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={direction === 'back' ? 'Previous month' : 'Next month'}
      accessibilityRole="button"
      className="h-10 w-10 items-center justify-center rounded-full border border-archive-700 bg-archive-900"
      onPress={onPress}>
      <Ionicons
        color="#fbf6ec"
        name={direction === 'back' ? 'chevron-back' : 'chevron-forward'}
        size={18}
      />
    </Pressable>
  );
}

function eventLabel(item: JournalCalendarEventItem) {
  if (item.event.type === 'started') return 'Started watching';
  if (item.event.type === 'stopped') return 'Stopped watching';
  return item.media.mediaType === 'movie' ? 'Watched' : 'Finished';
}

function LoggedCard({ item }: { item: JournalCalendarEventItem }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => openMedia(item.media)}>
      <Card className="flex-row gap-3">
        <MediaPoster imageUrl={item.media.imageUrl} size="sm" />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-bold uppercase text-teal-300">{eventLabel(item)}</Text>
          <Text className="text-base font-bold text-archive-50" numberOfLines={2}>{item.media.title}</Text>
          {item.event.rating != null ? <Text className="text-sm font-bold text-gold-300">{item.event.rating} / 5</Text> : null}
          {item.event.notes ? <Text className="text-sm text-archive-300" numberOfLines={2}>{item.event.notes}</Text> : null}
        </View>
      </Card>
    </Pressable>
  );
}

function PlanCard({ item }: { item: JournalCalendarPlanItem }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => openMedia(item.media)}>
      <Card className="flex-row gap-3 border-gold-700">
        <MediaPoster imageUrl={item.media.imageUrl} size="sm" />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-xs font-bold uppercase text-gold-300">Planned</Text>
          <Text className="text-base font-bold text-archive-50" numberOfLines={2}>{item.media.title}</Text>
          <Text className="text-sm text-archive-300">Active plan</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function JournalEventCalendarView({
  monthDate,
  onMonthChange,
  onSelectedDateChange,
  selectedDate,
  userId,
}: {
  monthDate: string;
  onMonthChange: (monthDate: string) => void;
  onSelectedDateChange: (date: string) => void;
  selectedDate: string;
  userId: string;
}) {
  const range = getJournalEventCalendarRange(monthDate);
  const query = useJournalCalendarRange(userId, range.startDate, range.endDate);

  if (query.isLoading) return <LoadingState message="Loading Calendar" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : 'Unable to load Calendar.'}
        onRetry={() => query.refetch()}
        title="Calendar unavailable"
      />
    );
  }

  const month = buildJournalEventCalendarMonth(monthDate, query.data);
  const selectedDay =
    month.days.find((day) => day.date === selectedDate) ??
    month.days.find((day) => day.date === month.monthDate)!;
  const changeMonth = (nextMonth: string) => {
    onMonthChange(nextMonth);
    onSelectedDateChange(calendarSelectionForMonth(nextMonth, localToday()));
  };
  const selectDate = (date: string) => {
    const selectedMonth = monthForSelectedCalendarDate(date);
    if (selectedMonth !== month.monthDate) onMonthChange(selectedMonth);
    onSelectedDateChange(date);
  };
  const monthName = displayDate(month.monthDate, { month: 'long' });

  return (
    <View className="gap-4">
      <Card className="gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <MonthButton direction="back" onPress={() => changeMonth(addJournalCalendarMonths(month.monthDate, -1))} />
          <Text className="text-center text-2xl font-bold text-archive-50">
            {displayDate(month.monthDate, { month: 'long', year: 'numeric' })}
          </Text>
          <MonthButton direction="forward" onPress={() => changeMonth(addJournalCalendarMonths(month.monthDate, 1))} />
        </View>

        <View className="flex-row">
          {WEEKDAYS.map((weekday) => (
            <View key={weekday} style={CELL_STYLE}>
              <Text className="text-center text-[10px] font-bold uppercase text-archive-400">{weekday}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {month.days.map((day) => (
            <CalendarCell day={day} key={day.date} onSelect={selectDate} selected={selectedDay.date === day.date} />
          ))}
        </View>

        <View className="flex-row items-center justify-center gap-4">
          <View className="flex-row items-center gap-1"><Ionicons color="#4fd1c5" name="ellipse" size={8} /><Text className="text-xs text-archive-300">Logged</Text></View>
          <View className="flex-row items-center gap-1"><Ionicons color="#f4c95d" name="calendar" size={11} /><Text className="text-xs text-archive-300">Planned</Text></View>
        </View>

        <Text className="text-center text-sm font-semibold text-archive-300">
          {monthName} · {month.completedCount} {month.completedCount === 1 ? 'watch' : 'watches'} · {month.planCount} {month.planCount === 1 ? 'plan' : 'plans'}
        </Text>
      </Card>

      <View className="gap-4">
        <Text className="text-lg font-bold text-archive-50">
          {displayDate(selectedDay.date, { day: 'numeric', month: 'long', weekday: 'long' })}
        </Text>
        <View className="gap-3">
          <Text className="text-sm font-bold uppercase text-teal-300">Logged</Text>
          {selectedDay.events.length ? selectedDay.events.map((item) => <LoggedCard item={item} key={item.event.id} />) : <Text className="text-sm text-archive-300">Nothing logged on this date.</Text>}
        </View>
        <View className="gap-3">
          <Text className="text-sm font-bold uppercase text-gold-300">Planned</Text>
          {selectedDay.plans.length ? selectedDay.plans.map((item) => <PlanCard item={item} key={item.journalEntryId} />) : <Text className="text-sm text-archive-300">No plans on this date.</Text>}
        </View>
      </View>
    </View>
  );
}
