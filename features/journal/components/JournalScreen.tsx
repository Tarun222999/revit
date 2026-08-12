import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { JournalEventCalendarView } from '@/features/journal/components/JournalEventCalendarView';
import { JournalPlannerView } from '@/features/journal/components/JournalPlannerView';
import { JournalTimelineFilters } from '@/features/journal/components/JournalTimelineFilters';
import { JournalTimelineView } from '@/features/journal/components/JournalTimelineView';
import { useJournalTimeline } from '@/features/journal/hooks/useJournalReads';
import { getJournalCalendarMonthDate } from '@/features/journal/model/journalCalendar';
import { localToday } from '@/features/journal/model/journalIntentForm';
import {
  getJournalFastCapture,
  type JournalNavigationView,
} from '@/features/journal/model/journalNavigation';
import {
  DEFAULT_TIMELINE_FILTERS,
  filterJournalTimeline,
  hasActiveTimelineFilters,
} from '@/features/journal/model/journalTimeline';
import type {
  JournalTimelineFilters as TimelineFilters,
  JournalTimelineItem,
} from '@/features/journal/types';
import { createMediaRouteId } from '@/features/media/api/media-api';
import { cn } from '@/lib/utils/cn';

type JournalView = JournalNavigationView;

function openMedia(media: {
  id: string;
  source: 'tmdb' | 'igdb';
  sourceId: string;
}) {
  const routeId = createMediaRouteId(media);
  router.push(`/title/${encodeURIComponent(routeId)}`);
}

function JournalViewSegment({
  activeView,
  onChange,
}: {
  activeView: JournalView;
  onChange: (view: JournalView) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-b border-archive-700"
    >
      {(['timeline', 'planner', 'calendar'] as const).map((view) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeView === view }}
          className={cn(
            'relative min-h-11 flex-1 items-center justify-center px-3',
          )}
          key={view}
          onPress={() => onChange(view)}>
          <Text
            className={cn(
              'text-sm font-semibold capitalize',
              activeView === view ? 'text-archive-50' : 'text-archive-300',
            )}>
            {view}
          </Text>
          {activeView === view ? (
            <View className="absolute bottom-0 h-0.5 w-12 self-center rounded-full bg-gold-400" />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

function TimelineContent({
  filters,
  onFiltersChange,
  userId,
}: {
  filters: TimelineFilters;
  onFiltersChange: (filters: TimelineFilters) => void;
  userId: string;
}) {
  const query = useJournalTimeline(userId);
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const visibleItems = useMemo(
    () => filterJournalTimeline(items, filters),
    [filters, items],
  );
  const activeFilters = hasActiveTimelineFilters(filters);

  if (query.isLoading) {
    return (
      <View className="px-5 pt-5">
        <LoadingState message="Loading Timeline" />
      </View>
    );
  }
  if (query.isError && !query.data) {
    return (
      <View className="px-5 pt-5">
        <ErrorState
          message={query.error instanceof Error ? query.error.message : 'Unable to load Timeline.'}
          onRetry={() => query.refetch()}
          title="Timeline unavailable"
        />
      </View>
    );
  }

  const empty = (
    <View className="gap-3">
      <EmptyState
        actionLabel={activeFilters ? 'Clear filters' : 'Find titles'}
        message={
          activeFilters
            ? 'No loaded activity matches these filters.'
            : 'Plans do not appear here. Log a watch, start, finish, or stop to build your Timeline.'
        }
        onAction={
          activeFilters
            ? () => onFiltersChange(DEFAULT_TIMELINE_FILTERS)
            : () => router.push('/search')
        }
        title={activeFilters ? 'No matches' : 'No activity yet'}
      />
      {activeFilters && query.hasNextPage ? (
        <Button
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
          title="Search earlier activity"
          variant="secondary"
        />
      ) : null}
    </View>
  );

  return (
    <JournalTimelineView
      empty={empty}
      footer={
        query.isFetchNextPageError ? (
          <ErrorState
            message="Earlier activity could not be loaded. Your current Timeline is unchanged."
            onRetry={() => query.fetchNextPage()}
            title="Could not load more"
          />
        ) : undefined
      }
      hasNextPage={Boolean(query.hasNextPage)}
      header={
        <JournalTimelineFilters
          filters={filters}
          onChange={onFiltersChange}
          resultCount={visibleItems.length}
        />
      }
      isFetchingNextPage={query.isFetchingNextPage}
      items={visibleItems}
      onItemPress={(item: JournalTimelineItem) =>
        openMedia({
          id: item.media.id,
          source: item.media.source,
          sourceId: item.media.sourceId,
        })
      }
      onLoadMore={() => void query.fetchNextPage()}
    />
  );
}

export function JournalScreen() {
  const { loading, user } = useAuth();
  const [activeView, setActiveView] = useState<JournalView>('timeline');
  const [timelineFilters, setTimelineFilters] = useState(DEFAULT_TIMELINE_FILTERS);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getJournalCalendarMonthDate(localToday()),
  );
  const [calendarDate, setCalendarDate] = useState(localToday);
  const setView = useCallback((view: JournalView) => setActiveView(view), []);
  const fastCapture = getJournalFastCapture(activeView);
  const openFastCapture = () => {
    if (!user) {
      router.push('/welcome');
      return;
    }
    router.push({
      pathname: '/search',
      params: {
        journalCapture: fastCapture.capture,
        journalReturn: 'true',
      },
    });
  };

  return (
    <Screen padded={false}>
      <View className="gap-5 px-5 pt-6">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-bold text-archive-50">Your Journal</Text>
            <Text className="text-sm text-archive-300">
              {activeView === 'planner'
                ? 'Decide what comes next.'
                : 'Keep your personal viewing record.'}
            </Text>
          </View>
          <Button
            className="min-h-10 px-4"
            onPress={openFastCapture}
            title={fastCapture.label}
          />
        </View>
        <JournalViewSegment activeView={activeView} onChange={setView} />
      </View>
      {loading ? (
        <View className="px-5 pt-5">
          <LoadingState message="Loading Journal" />
        </View>
      ) : null}
      {!loading && !user ? (
        <View className="px-5 pt-5">
          <EmptyState
            message="Sign in to keep your plans and personal viewing history."
            title="Sign in to use Journal"
          />
        </View>
      ) : null}
      {!loading && user && activeView === 'timeline' ? (
        <TimelineContent
          filters={timelineFilters}
          onFiltersChange={setTimelineFilters}
          userId={user.id}
        />
      ) : null}
      {!loading && user && activeView === 'calendar' ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-28 pt-5"
          showsVerticalScrollIndicator={false}>
          <JournalEventCalendarView
            monthDate={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelectedDateChange={setCalendarDate}
            selectedDate={calendarDate}
            userId={user.id}
          />
        </ScrollView>
      ) : null}
      {!loading && user && activeView === 'planner' ? (
        <JournalPlannerView userId={user.id} />
      ) : null}
    </Screen>
  );
}
