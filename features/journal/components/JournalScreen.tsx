import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

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

type JournalView = 'timeline' | 'planner' | 'calendar';

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
    <View className="flex-row rounded-app border border-archive-700 bg-archive-800 p-1">
      {(['timeline', 'planner', 'calendar'] as const).map((view) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeView === view }}
          className={cn(
            'min-h-10 flex-1 items-center justify-center rounded-md px-3',
            activeView === view && 'bg-gold-400',
          )}
          key={view}
          onPress={() => onChange(view)}>
          <Text
            className={cn(
              'text-sm font-semibold capitalize',
              activeView === view ? 'text-archive-900' : 'text-archive-200',
            )}>
            {view}
          </Text>
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

  if (query.isLoading) return <LoadingState message="Loading Timeline" />;
  if (query.isError && !query.data) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : 'Unable to load Timeline.'}
        onRetry={() => query.refetch()}
        title="Timeline unavailable"
      />
    );
  }

  return (
    <>
      <JournalTimelineFilters
        filters={filters}
        onChange={onFiltersChange}
        resultCount={visibleItems.length}
      />
      {visibleItems.length ? (
        <JournalTimelineView
          hasNextPage={Boolean(query.hasNextPage)}
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
      ) : (
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
      )}
      {query.isFetchNextPageError ? (
        <ErrorState
          message="Earlier activity could not be loaded. Your current Timeline is unchanged."
          onRetry={() => query.fetchNextPage()}
          title="Could not load more"
        />
      ) : null}
    </>
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

  return (
    <Screen scroll className="gap-5">
      <JournalViewSegment activeView={activeView} onChange={setView} />
      {loading ? <LoadingState message="Loading Journal" /> : null}
      {!loading && !user ? (
        <EmptyState
          message="Sign in to keep your plans and personal viewing history."
          title="Sign in to use Journal"
        />
      ) : null}
      {!loading && user && activeView === 'timeline' ? (
        <TimelineContent
          filters={timelineFilters}
          onFiltersChange={setTimelineFilters}
          userId={user.id}
        />
      ) : null}
      {!loading && user && activeView === 'calendar' ? (
        <JournalEventCalendarView
          monthDate={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSelectedDateChange={setCalendarDate}
          selectedDate={calendarDate}
          userId={user.id}
        />
      ) : null}
      {!loading && user && activeView === 'planner' ? (
        <JournalPlannerView userId={user.id} />
      ) : null}
    </Screen>
  );
}
