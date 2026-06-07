import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { JournalCalendarView } from '@/features/journal/components/JournalCalendarView';
import { JournalFilterBoard } from '@/features/journal/components/JournalFilterBoard';
import { JournalTimelineView } from '@/features/journal/components/JournalTimelineView';
import { useJournalEntries } from '@/features/journal/hooks/useJournalEntries';
import {
  addJournalCalendarMonths,
  getJournalCalendarMonth,
  getJournalCalendarMonthDate,
} from '@/features/journal/model/journalCalendar';
import {
  getVisibleJournalEntries,
  hasActiveJournalFilters,
  JOURNAL_DEFAULT_FILTERS,
  JOURNAL_DEFAULT_SORT,
} from '@/features/journal/model/journalList';
import type {
  JournalListEntry,
  JournalListFilters,
  JournalSort,
} from '@/features/journal/types';
import { createMediaRouteId } from '@/features/media/api/media-api';
import { cn } from '@/lib/utils/cn';

type JournalView = 'timeline' | 'calendar';

type JournalEntriesQuery = ReturnType<typeof useJournalEntries>;

const JOURNAL_LOADING_PLACEHOLDER_COUNT = 2;

const JOURNAL_VIEW_OPTIONS: Array<{
  label: string;
  value: JournalView;
}> = [
  { label: 'Timeline', value: 'timeline' },
  { label: 'Calendar', value: 'calendar' },
];

function getJournalErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to load your journal right now.';
}

function JournalLoadingState() {
  return (
    <View className="gap-4">
      <LoadingState message="Loading journal entries" />

      {Array.from({ length: JOURNAL_LOADING_PLACEHOLDER_COUNT }).map(
        (_, placeholderIndex) => (
          <Card className="gap-3" key={placeholderIndex}>
            <View className="flex-row gap-3">
              <View className="h-24 w-16 rounded-app bg-shelf-700" />
              <View className="min-w-0 flex-1 gap-3">
                <View className="h-4 w-3/4 rounded-full bg-archive-700" />
                <View className="h-3 w-1/2 rounded-full bg-archive-700" />
                <View className="flex-row gap-2">
                  <View className="h-6 w-16 rounded-full bg-archive-700" />
                  <View className="h-6 w-20 rounded-full bg-archive-700" />
                </View>
                <View className="h-3 w-full rounded-full bg-archive-700" />
                <View className="h-3 w-2/3 rounded-full bg-archive-700" />
              </View>
            </View>
          </Card>
        ),
      )}
    </View>
  );
}

function JournalViewSegment({
  activeView,
  onViewChange,
}: {
  activeView: JournalView;
  onViewChange: (view: JournalView) => void;
}) {
  return (
    <View className="flex-row rounded-app border border-archive-700 bg-archive-800 p-1">
      {JOURNAL_VIEW_OPTIONS.map((view) => {
        const selected = view.value === activeView;

        return (
          <Pressable
            accessibilityRole="button"
            key={view.value}
            onPress={() => onViewChange(view.value)}
            className={cn(
              'min-h-10 flex-1 items-center justify-center rounded-md px-3',
              selected && 'bg-gold-400',
            )}>
            <Text
              className={cn(
                'text-sm font-semibold',
                selected ? 'text-archive-900' : 'text-archive-200',
              )}>
              {view.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimelineShell({
  entries,
  onEntryPress,
  sort,
}: {
  entries: JournalListEntry[];
  onEntryPress: (entry: JournalListEntry) => void;
  sort: JournalSort;
}) {
  return (
    <JournalTimelineView
      entries={entries}
      sort={sort}
      onEntryPress={onEntryPress}
    />
  );
}

function getDefaultCalendarMonthDate(entries: JournalListEntry[]) {
  const currentMonthDate = getJournalCalendarMonthDate(new Date().toISOString());

  if (
    entries.some(
      (entry) => getJournalCalendarMonthDate(entry.createdAt) === currentMonthDate,
    )
  ) {
    return currentMonthDate;
  }

  const mostRecentEntry = entries.reduce<JournalListEntry | null>(
    (mostRecent, entry) =>
      !mostRecent || entry.createdAt > mostRecent.createdAt ? entry : mostRecent,
    null,
  );

  return mostRecentEntry
    ? getJournalCalendarMonthDate(mostRecentEntry.createdAt)
    : currentMonthDate;
}

function CalendarShell({
  entries,
  onEntryPress,
}: {
  entries: JournalListEntry[];
  onEntryPress: (entry: JournalListEntry) => void;
}) {
  const defaultMonthDate = useMemo(
    () => getDefaultCalendarMonthDate(entries),
    [entries],
  );
  const [monthDate, setMonthDate] = useState(defaultMonthDate);
  const month = useMemo(
    () => getJournalCalendarMonth(entries, monthDate),
    [entries, monthDate],
  );

  useEffect(() => {
    setMonthDate(defaultMonthDate);
  }, [defaultMonthDate]);

  const showPreviousMonth = useCallback(() => {
    setMonthDate((currentMonthDate) =>
      addJournalCalendarMonths(currentMonthDate, -1),
    );
  }, []);

  const showNextMonth = useCallback(() => {
    setMonthDate((currentMonthDate) =>
      addJournalCalendarMonths(currentMonthDate, 1),
    );
  }, []);

  return (
    <JournalCalendarView
      month={month}
      onEntryPress={onEntryPress}
      onNextMonth={showNextMonth}
      onPreviousMonth={showPreviousMonth}
    />
  );
}

function JournalLoadedContent({
  activeView,
  activeFilters,
  entries,
  filters,
  sort,
  visibleEntries,
  onClearFilters,
  onEntryPress,
  onFiltersChange,
  onSortChange,
}: {
  activeView: JournalView;
  activeFilters: boolean;
  entries: JournalListEntry[];
  filters: JournalListFilters;
  sort: JournalSort;
  visibleEntries: JournalListEntry[];
  onClearFilters: () => void;
  onEntryPress: (entry: JournalListEntry) => void;
  onFiltersChange: (filters: JournalListFilters) => void;
  onSortChange: (sort: JournalSort) => void;
}) {
  return (
    <>
      <JournalFilterBoard
        entries={entries}
        filters={filters}
        hasActiveFilters={activeFilters}
        sort={sort}
        visibleCount={visibleEntries.length}
        onClearFilters={onClearFilters}
        onFiltersChange={onFiltersChange}
        onSortChange={onSortChange}
      />

      {visibleEntries.length > 0 ? (
        activeView === 'timeline' ? (
          <TimelineShell
            entries={visibleEntries}
            sort={sort}
            onEntryPress={onEntryPress}
          />
        ) : (
          <CalendarShell
            entries={visibleEntries}
            onEntryPress={onEntryPress}
          />
        )
      ) : (
        <EmptyState
          title="No matches"
          message="Nothing matches the current journal lens. Clear filters to see every logged title."
          actionLabel="Clear filters"
          onAction={onClearFilters}
        />
      )}
    </>
  );
}

function JournalContent({
  activeView,
  activeFilters,
  authLoading,
  entries,
  filters,
  isSignedIn,
  journalQuery,
  sort,
  visibleEntries,
  onClearFilters,
  onEntryPress,
  onFiltersChange,
  onSortChange,
}: {
  activeView: JournalView;
  activeFilters: boolean;
  authLoading: boolean;
  entries: JournalListEntry[];
  filters: JournalListFilters;
  isSignedIn: boolean;
  journalQuery: JournalEntriesQuery;
  sort: JournalSort;
  visibleEntries: JournalListEntry[];
  onClearFilters: () => void;
  onEntryPress: (entry: JournalListEntry) => void;
  onFiltersChange: (filters: JournalListFilters) => void;
  onSortChange: (sort: JournalSort) => void;
}) {
  if (authLoading) {
    return <LoadingState message="Loading journal" />;
  }

  if (!isSignedIn) {
    return (
      <EmptyState
        title="Sign in to view your journal"
        message="Your logged titles, ratings, and short reviews will appear here after you sign in."
      />
    );
  }

  if (journalQuery.isLoading) {
    return <JournalLoadingState />;
  }

  if (journalQuery.isError) {
    return (
      <ErrorState
        title="Journal unavailable"
        message={getJournalErrorMessage(journalQuery.error)}
        retryLabel="Reload journal"
        onRetry={() => journalQuery.refetch()}
      />
    );
  }

  if (journalQuery.isSuccess && entries.length === 0) {
    return (
      <EmptyState
        title="Your journal is ready"
        message="Search for a title, add it to your journal, then come back here to manage the log."
        actionLabel="Find titles"
        onAction={() => router.push('/search')}
      />
    );
  }

  if (!journalQuery.isSuccess) {
    return null;
  }

  return (
    <JournalLoadedContent
      activeView={activeView}
      activeFilters={activeFilters}
      entries={entries}
      filters={filters}
      sort={sort}
      visibleEntries={visibleEntries}
      onClearFilters={onClearFilters}
      onEntryPress={onEntryPress}
      onFiltersChange={onFiltersChange}
      onSortChange={onSortChange}
    />
  );
}

function openEntryTitleDetails(entry: JournalListEntry) {
  const routeId = createMediaRouteId({
    id: entry.mediaItemId,
    source: entry.source,
    sourceId: entry.sourceId,
  });

  router.push(`/title/${encodeURIComponent(routeId)}`);
}

/**
 * Renders the journal management screen with auth, loading, empty, error,
 * filter, and timeline states.
 *
 * @returns The user's journal timeline screen.
 */
export function JournalScreen() {
  const { loading: authLoading, user } = useAuth();
  const [activeView, setActiveView] = useState<JournalView>('timeline');
  const [filters, setFilters] = useState<JournalListFilters>(
    JOURNAL_DEFAULT_FILTERS,
  );
  const [sort, setSort] = useState<JournalSort>(JOURNAL_DEFAULT_SORT);
  const journalQuery = useJournalEntries(user?.id);
  const entries = journalQuery.data ?? [];
  const visibleEntries = useMemo(
    () =>
      getVisibleJournalEntries({
        entries,
        filters,
        sort,
      }),
    [entries, filters, sort],
  );
  const activeFilters = hasActiveJournalFilters(filters);
  const clearFilters = useCallback(() => setFilters(JOURNAL_DEFAULT_FILTERS), []);

  return (
    <Screen scroll className="gap-5">
      <SectionHeader
        title="My Journal"
        subtitle="Browse and manage the titles you have logged."
      />

      <JournalViewSegment
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <JournalContent
        activeView={activeView}
        activeFilters={activeFilters}
        authLoading={authLoading}
        entries={entries}
        filters={filters}
        isSignedIn={Boolean(user)}
        journalQuery={journalQuery}
        sort={sort}
        visibleEntries={visibleEntries}
        onClearFilters={clearFilters}
        onEntryPress={openEntryTitleDetails}
        onFiltersChange={setFilters}
        onSortChange={setSort}
      />
    </Screen>
  );
}
