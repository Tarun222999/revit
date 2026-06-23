import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  JOURNAL_STATUS_LABELS,
  type JournalStatus,
} from '@/constants/journal';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import {
  JOURNAL_DEFAULT_FILTERS,
  JOURNAL_DEFAULT_SORT,
} from '@/features/journal/model/journalList';
import type {
  JournalDateFilter,
  JournalListFilters,
  JournalMediaFilter,
  JournalRatingFilter,
  JournalSort,
} from '@/features/journal/types';
import { cn } from '@/lib/utils/cn';

type JournalFilterBoardProps = {
  expanded: boolean;
  filters: JournalListFilters;
  hasActiveFilters: boolean;
  sort: JournalSort;
  visibleCount: number;
  onClearFilters: () => void;
  onFiltersChange: (filters: JournalListFilters) => void;
  onSortChange: (sort: JournalSort) => void;
  onToggleExpanded: () => void;
};

type FilterIcon =
  | 'calendar-outline'
  | 'checkmark-circle-outline'
  | 'close'
  | 'film-outline'
  | 'play-circle-outline'
  | 'sparkles-outline'
  | 'star-outline'
  | 'time-outline'
  | 'trash-outline'
  | 'tv-outline';

const MEDIA_FILTER_OPTIONS: Array<{
  icon: FilterIcon;
  label: string;
  value: Exclude<JournalMediaFilter, 'all'>;
}> = [
  { icon: 'film-outline', label: MEDIA_TYPE_LABELS.movie, value: 'movie' },
  { icon: 'tv-outline', label: MEDIA_TYPE_LABELS.series, value: 'series' },
  { icon: 'sparkles-outline', label: MEDIA_TYPE_LABELS.anime, value: 'anime' },
];

const STATUS_FILTER_OPTIONS: Array<{
  icon: FilterIcon;
  label: string;
  value: JournalStatus;
}> = [
  { icon: 'checkmark-circle-outline', label: JOURNAL_STATUS_LABELS.completed, value: 'completed' },
  { icon: 'play-circle-outline', label: JOURNAL_STATUS_LABELS.in_progress, value: 'in_progress' },
  { icon: 'calendar-outline', label: JOURNAL_STATUS_LABELS.planned, value: 'planned' },
  { icon: 'trash-outline', label: JOURNAL_STATUS_LABELS.dropped, value: 'dropped' },
];

const DATE_FILTER_OPTIONS: Array<{
  icon: FilterIcon;
  label: string;
  value: JournalDateFilter;
}> = [
  { icon: 'calendar-outline', label: 'This Month', value: 'this_month' },
  { icon: 'time-outline', label: 'Last 30 Days', value: 'last_30_days' },
  { icon: 'calendar-outline', label: 'This Year', value: 'this_year' },
];

const SORT_OPTIONS: Array<{ label: string; value: JournalSort }> = [
  { label: 'Recent activity', value: 'recent_activity' },
  { label: 'Recently added', value: 'recently_added' },
  { label: 'Rating', value: 'rating' },
  { label: 'Title', value: 'title' },
];

const RATING_FILTER_OPTIONS: Array<{
  icon: FilterIcon;
  label: string;
  value: JournalRatingFilter;
}> = [
  { icon: 'star-outline', label: 'Any', value: 'any' },
  { icon: 'star-outline', label: 'Rated', value: 'rated' },
  { icon: 'star-outline', label: 'Unrated', value: 'unrated' },
  { icon: 'star-outline', label: '4+', value: 'gte_4' },
  { icon: 'star-outline', label: '3+', value: 'gte_3' },
];

const STATUS_COLOR_CLASSES: Record<
  JournalStatus,
  { idle: string; selected: string; text: string }
> = {
  completed: {
    idle: 'border-gold-500 bg-archive-800',
    selected: 'border-gold-400 bg-shelf-700',
    text: 'text-gold-300',
  },
  dropped: {
    idle: 'border-reel-500 bg-archive-800',
    selected: 'border-reel-400 bg-reel-500',
    text: 'text-archive-50',
  },
  in_progress: {
    idle: 'border-teal-500 bg-archive-800',
    selected: 'border-teal-500 bg-teal-500',
    text: 'text-teal-300',
  },
  planned: {
    idle: 'border-archive-500 bg-archive-800',
    selected: 'border-archive-300 bg-archive-700',
    text: 'text-archive-100',
  },
};

function getDateLabel(date: JournalDateFilter) {
  return DATE_FILTER_OPTIONS.find((option) => option.value === date)?.label;
}

function getRatingLabel(rating: JournalRatingFilter) {
  return RATING_FILTER_OPTIONS.find((option) => option.value === rating)?.label;
}

function getActiveFilterSummary(filters: JournalListFilters) {
  const activeFilterLabels: string[] = [];

  if (filters.mediaType !== 'all') {
    activeFilterLabels.push(MEDIA_TYPE_LABELS[filters.mediaType]);
  }

  if (filters.statuses.length > 0) {
    activeFilterLabels.push(
      filters.statuses.map((status) => JOURNAL_STATUS_LABELS[status]).join(', '),
    );
  }

  if (filters.rating !== 'any') {
    activeFilterLabels.push(getRatingLabel(filters.rating) ?? 'Rating');
  }

  if (filters.date !== 'all') {
    activeFilterLabels.push(getDateLabel(filters.date) ?? 'Date');
  }

  return activeFilterLabels.length > 0
    ? activeFilterLabels.join(' / ')
    : 'Everything active';
}

function toggleStatus(statuses: JournalStatus[], status: JournalStatus) {
  return statuses.includes(status)
    ? statuses.filter((currentStatus) => currentStatus !== status)
    : [...statuses, status];
}

function SectionLabel({
  rightLabel,
  title,
}: {
  rightLabel?: string;
  title: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-sm font-bold uppercase text-archive-300">
        {title}
      </Text>
      {rightLabel ? (
        <Text className="text-sm font-semibold text-archive-300">{rightLabel}</Text>
      ) : null}
    </View>
  );
}

function FilterPill({
  icon,
  label,
  selected,
  tone = 'gold',
  onPress,
}: {
  icon?: FilterIcon;
  label: string;
  selected: boolean;
  tone?: 'gold' | 'neutral';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-11 flex-row items-center justify-center gap-2 rounded-full border px-4',
        selected && tone === 'gold' && 'border-gold-400 bg-gold-400',
        selected && tone === 'neutral' && 'border-archive-300 bg-archive-700',
        !selected && 'border-archive-500 bg-archive-800',
      )}>
      {icon ? (
        <Ionicons
          color={selected && tone === 'gold' ? '#4b3603' : '#fbf6ec'}
          name={icon}
          size={18}
        />
      ) : null}
      <Text
        className={cn(
          'text-base font-bold',
          selected && tone === 'gold' ? 'text-archive-900' : 'text-archive-50',
        )}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusPill({
  option,
  selected,
  onPress,
}: {
  option: (typeof STATUS_FILTER_OPTIONS)[number];
  selected: boolean;
  onPress: () => void;
}) {
  const colorClasses = STATUS_COLOR_CLASSES[option.value];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-11 flex-row items-center justify-center gap-2 rounded-full border px-4',
        selected ? colorClasses.selected : colorClasses.idle,
      )}>
      <Ionicons color="#f4c95d" name={option.icon} size={18} />
      <Text className={cn('text-base font-bold', colorClasses.text)}>
        {option.label}
      </Text>
    </Pressable>
  );
}

function RatingPresetControl({
  filters,
  onChange,
}: {
  filters: JournalListFilters;
  onChange: (filters: JournalListFilters) => void;
}) {
  return (
    <View className="gap-4">
      <SectionLabel title="Rating" />
      <View className="flex-row flex-wrap gap-3">
        {RATING_FILTER_OPTIONS.map((option) => (
          <FilterPill
            icon={option.icon}
            key={option.value}
            label={option.label}
            selected={filters.rating === option.value}
            onPress={() =>
              onChange({
                ...filters,
                rating: option.value,
              })
            }
          />
        ))}
      </View>
    </View>
  );
}

function FilterSheet({
  draftFilters,
  draftSort,
  visible,
  onApply,
  onClose,
  onDraftFiltersChange,
  onDraftSortChange,
  onClearAll,
  onReset,
}: {
  draftFilters: JournalListFilters;
  draftSort: JournalSort;
  visible: boolean;
  onApply: () => void;
  onClearAll: () => void;
  onClose: () => void;
  onDraftFiltersChange: (filters: JournalListFilters) => void;
  onDraftSortChange: (sort: JournalSort) => void;
  onReset: () => void;
}) {
  const setMediaType = (mediaType: Exclude<JournalMediaFilter, 'all'>) => {
    onDraftFiltersChange({
      ...draftFilters,
      mediaType: draftFilters.mediaType === mediaType ? 'all' : mediaType,
    });
  };
  const setDate = (date: JournalDateFilter) => {
    onDraftFiltersChange({
      ...draftFilters,
      date: draftFilters.date === date ? 'all' : date,
    });
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[88%] rounded-t-[32px] border border-archive-700 bg-archive-900 px-6 pb-7 pt-4">
          <View className="self-center rounded-full bg-archive-700 px-12 py-1" />

          <View className="mt-8 flex-row items-center justify-between">
            <Pressable accessibilityRole="button" onPress={onReset}>
              <Text className="text-lg font-bold text-gold-300">Reset</Text>
            </Pressable>
            <Text className="text-3xl font-bold text-archive-50">Filters</Text>
            <Pressable
              accessibilityRole="button"
              className="h-14 w-14 items-center justify-center rounded-full bg-archive-800"
              onPress={onClose}>
              <Ionicons color="#fbf6ec" name="close" size={30} />
            </Pressable>
          </View>

          <ScrollView
            className="mt-8"
            contentContainerClassName="gap-7 pb-8"
            showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <SectionLabel title="Type" />
              <View className="flex-row flex-wrap gap-3">
                {MEDIA_FILTER_OPTIONS.map((option) => (
                  <FilterPill
                    icon={option.icon}
                    key={option.value}
                    label={option.label}
                    selected={draftFilters.mediaType === option.value}
                    onPress={() => setMediaType(option.value)}
                  />
                ))}
              </View>
            </View>

            <View className="gap-4">
              <SectionLabel title="Status" />
              <View className="flex-row flex-wrap gap-3">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <StatusPill
                    key={option.value}
                    option={option}
                    selected={draftFilters.statuses.includes(option.value)}
                    onPress={() =>
                      onDraftFiltersChange({
                        ...draftFilters,
                        statuses: toggleStatus(draftFilters.statuses, option.value),
                      })
                    }
                  />
                ))}
              </View>
            </View>

            <RatingPresetControl
              filters={draftFilters}
              onChange={onDraftFiltersChange}
            />

            <View className="gap-4">
              <SectionLabel title="Date" />
              <View className="flex-row flex-wrap gap-3">
                {DATE_FILTER_OPTIONS.map((option) => (
                  <FilterPill
                    icon={option.icon}
                    key={option.value}
                    label={option.label}
                    selected={draftFilters.date === option.value}
                    onPress={() => setDate(option.value)}
                  />
                ))}
              </View>
            </View>

            <View className="gap-4">
              <SectionLabel title="Sort" />
              <View className="flex-row flex-wrap gap-3">
                {SORT_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.value}
                    label={option.label}
                    selected={draftSort === option.value}
                    tone="neutral"
                    onPress={() => onDraftSortChange(option.value)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View className="gap-3 border-t border-archive-700 pt-4">
            <Button
              title="Apply Filters"
              className="min-h-14"
              onPress={onApply}
            />
            <Button
              title="Clear All"
              variant="ghost"
              className="min-h-14 bg-archive-800"
              onPress={onClearAll}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Renders the journal filtering and sorting controls for the Timeline view.
 *
 * @param filters - Current active filter state.
 * @param hasActiveFilters - Whether at least one non-default filter is applied.
 * @param sort - Current sort selection.
 * @param visibleCount - Count of entries visible after filtering.
 * @returns The filter board summary and bottom-sheet filter controls.
 */
export function JournalFilterBoard({
  expanded,
  filters,
  hasActiveFilters,
  sort,
  visibleCount,
  onClearFilters,
  onFiltersChange,
  onSortChange,
  onToggleExpanded,
}: JournalFilterBoardProps) {
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftSort, setDraftSort] = useState(sort);

  useEffect(() => {
    if (expanded) {
      setDraftFilters(filters);
      setDraftSort(sort);
    }
  }, [expanded, filters, sort]);

  const resetDraft = () => {
    setDraftFilters(JOURNAL_DEFAULT_FILTERS);
    setDraftSort(JOURNAL_DEFAULT_SORT);
  };
  const applyDraft = () => {
    onFiltersChange(draftFilters);
    onSortChange(draftSort);
    onToggleExpanded();
  };
  const clearAll = () => {
    onFiltersChange(JOURNAL_DEFAULT_FILTERS);
    onSortChange(JOURNAL_DEFAULT_SORT);
    onToggleExpanded();
  };

  return (
    <>
      <Card className="gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-xs font-bold uppercase text-archive-300">
              Current lens
            </Text>
            <Text className="text-lg font-bold text-archive-50" numberOfLines={2}>
              {getActiveFilterSummary(filters)}
            </Text>
            <Text className="text-xs font-semibold text-archive-300">
              Sort: {SORT_OPTIONS.find((option) => option.value === sort)?.label}
            </Text>
          </View>
          <View className="rounded-full border border-archive-500 bg-archive-800 px-4 py-2">
            <Text className="text-sm font-bold text-archive-100">
              {visibleCount} {visibleCount === 1 ? 'result' : 'results'}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Button
            title="Filters"
            variant="secondary"
            className="flex-1"
            onPress={onToggleExpanded}
          />
          {hasActiveFilters ? (
            <Button
              title="Clear"
              variant="ghost"
              className="w-24"
              onPress={onClearFilters}
            />
          ) : null}
        </View>
      </Card>

      <FilterSheet
        draftFilters={draftFilters}
        draftSort={draftSort}
        visible={expanded}
        onApply={applyDraft}
        onClearAll={clearAll}
        onClose={onToggleExpanded}
        onDraftFiltersChange={setDraftFilters}
        onDraftSortChange={setDraftSort}
        onReset={resetDraft}
      />
    </>
  );
}
