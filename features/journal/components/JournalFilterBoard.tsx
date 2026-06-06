import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { JOURNAL_STATUS_LABELS, JOURNAL_STATUSES } from '@/constants/journal';
import { MEDIA_TYPE_LABELS, type MediaType } from '@/constants/media';
import type {
  JournalListEntry,
  JournalListFilters,
  JournalMediaFilter,
  JournalRatingFilter,
  JournalSort,
  JournalStatusFilter,
} from '@/features/journal/types';
import { cn } from '@/lib/utils/cn';

type JournalFilterBoardProps = {
  entries: JournalListEntry[];
  filters: JournalListFilters;
  hasActiveFilters: boolean;
  sort: JournalSort;
  visibleCount: number;
  onClearFilters: () => void;
  onFiltersChange: (filters: JournalListFilters) => void;
  onSortChange: (sort: JournalSort) => void;
};

type MediaOption = {
  label: string;
  value: JournalMediaFilter;
};

type RatingOption = {
  label: string;
  value: JournalRatingFilter;
};

type SortOption = {
  label: string;
  value: JournalSort;
};

const mediaOptions: MediaOption[] = [
  { label: 'All', value: 'all' },
  { label: MEDIA_TYPE_LABELS.movie, value: 'movie' },
  { label: MEDIA_TYPE_LABELS.series, value: 'series' },
  { label: MEDIA_TYPE_LABELS.anime, value: 'anime' },
];

const statusOptions: Array<{ label: string; value: JournalStatusFilter }> = [
  { label: 'All', value: 'all' },
  ...JOURNAL_STATUSES.map((status) => ({
    label: JOURNAL_STATUS_LABELS[status],
    value: status,
  })),
];

const ratingOptions: RatingOption[] = [
  { label: 'Any', value: 'any' },
  { label: 'Rated', value: 'rated' },
  { label: 'Unrated', value: 'unrated' },
  { label: '4+', value: 'gte_4' },
  { label: '3+', value: 'gte_3' },
];

const sortOptions: SortOption[] = [
  { label: 'Recent activity', value: 'recent_activity' },
  { label: 'Recently added', value: 'recently_added' },
  { label: 'Rating', value: 'rating' },
  { label: 'Title', value: 'title' },
];

const statusDotClasses: Record<JournalStatusFilter, string> = {
  all: 'bg-archive-300',
  planned: 'bg-archive-300',
  in_progress: 'bg-teal-500',
  completed: 'bg-gold-400',
  dropped: 'bg-reel-400',
};

function countEntriesForMedia(entries: JournalListEntry[], mediaType: JournalMediaFilter) {
  if (mediaType === 'all') {
    return entries.length;
  }

  return entries.filter((entry) => entry.mediaType === mediaType).length;
}

function filterLabel(filters: JournalListFilters) {
  const parts = [];

  if (filters.mediaType !== 'all') {
    parts.push(MEDIA_TYPE_LABELS[filters.mediaType]);
  }

  if (filters.status !== 'all') {
    parts.push(JOURNAL_STATUS_LABELS[filters.status]);
  }

  if (filters.rating !== 'any') {
    const rating = ratingOptions.find((option) => option.value === filters.rating);
    parts.push(rating?.label ?? 'Rating');
  }

  return parts.length > 0 ? parts.join(' / ') : 'Everything active';
}

function FilterTile({
  count,
  label,
  selected,
  onPress,
}: {
  count: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-16 flex-1 justify-between rounded-app border p-3',
        selected
          ? 'border-archive-50 bg-archive-50'
          : 'border-archive-700 bg-archive-900',
      )}>
      <Text
        className={cn(
          'text-xs font-bold',
          selected ? 'text-archive-900' : 'text-archive-100',
        )}>
        {label}
      </Text>
      <Text
        className={cn(
          'text-lg font-bold',
          selected ? 'text-archive-900' : 'text-archive-300',
        )}>
        {count}
      </Text>
    </Pressable>
  );
}

function OptionPill({
  label,
  selected,
  status,
  onPress,
}: {
  label: string;
  selected: boolean;
  status?: JournalStatusFilter;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-9 flex-row items-center justify-center gap-2 rounded-full border px-3',
        selected
          ? 'border-gold-400 bg-gold-400'
          : 'border-archive-700 bg-archive-900',
      )}>
      {status ? (
        <View
          className={cn(
            'h-2 w-2 rounded-full',
            selected ? 'bg-archive-900' : statusDotClasses[status],
          )}
        />
      ) : null}
      <Text
        className={cn(
          'text-xs font-bold',
          selected ? 'text-archive-900' : 'text-archive-100',
        )}>
        {label}
      </Text>
    </Pressable>
  );
}

function LaneLabel({ title }: { title: string }) {
  return <Text className="text-xs font-bold uppercase text-archive-300">{title}</Text>;
}

export function JournalFilterBoard({
  entries,
  filters,
  hasActiveFilters,
  sort,
  visibleCount,
  onClearFilters,
  onFiltersChange,
  onSortChange,
}: JournalFilterBoardProps) {
  const updateFilters = (nextFilters: Partial<JournalListFilters>) => {
    onFiltersChange({
      ...filters,
      ...nextFilters,
    });
  };

  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-xs font-bold uppercase text-archive-300">
            Current lens
          </Text>
          <Text className="text-lg font-bold text-archive-50">
            {filterLabel(filters)}
          </Text>
        </View>
        <View className="rounded-full bg-gold-400 px-3 py-2">
          <Text className="text-xs font-bold text-archive-900">{visibleCount}</Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        {mediaOptions.map((option) => (
          <FilterTile
            count={countEntriesForMedia(entries, option.value)}
            key={option.value}
            label={option.label}
            selected={filters.mediaType === option.value}
            onPress={() => updateFilters({ mediaType: option.value })}
          />
        ))}
      </View>

      <View className="gap-3 rounded-app border border-archive-700 bg-archive-900 p-3">
        <LaneLabel title="Status track" />
        <View className="flex-row flex-wrap gap-2">
          {statusOptions.map((option) => (
            <OptionPill
              key={option.value}
              label={option.label}
              selected={filters.status === option.value}
              status={option.value}
              onPress={() => updateFilters({ status: option.value })}
            />
          ))}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-3 rounded-app border border-archive-700 bg-archive-900 p-3">
          <LaneLabel title="Rating" />
          <View className="flex-row flex-wrap gap-2">
            {ratingOptions.map((option) => (
              <OptionPill
                key={option.value}
                label={option.label}
                selected={filters.rating === option.value}
                onPress={() => updateFilters({ rating: option.value })}
              />
            ))}
          </View>
        </View>
      </View>

      <View className="gap-3 rounded-app border border-archive-700 bg-archive-900 p-3">
        <LaneLabel title="Sort" />
        <View className="flex-row flex-wrap gap-2">
          {sortOptions.map((option) => (
            <OptionPill
              key={option.value}
              label={option.label}
              selected={sort === option.value}
              onPress={() => onSortChange(option.value)}
            />
          ))}
        </View>
      </View>

      {hasActiveFilters ? (
        <Button title="Clear filters" variant="ghost" onPress={onClearFilters} />
      ) : null}
    </Card>
  );
}
