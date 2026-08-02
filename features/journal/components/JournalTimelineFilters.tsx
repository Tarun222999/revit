import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import { DEFAULT_TIMELINE_FILTERS } from '@/features/journal/model/journalTimeline';
import type {
  JournalEventType,
  JournalTimelineFilters as Filters,
} from '@/features/journal/types';
import { cn } from '@/lib/utils/cn';

function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'rounded-full border px-3 py-2',
        selected ? 'border-gold-400 bg-gold-400' : 'border-archive-600 bg-archive-900',
      )}
      onPress={onPress}>
      <Text className={cn('text-sm font-semibold', selected ? 'text-archive-900' : 'text-archive-200')}>
        {label}
      </Text>
    </Pressable>
  );
}

export function JournalTimelineFilters({
  filters,
  onChange,
  resultCount,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggleEvent = (eventType: JournalEventType) => {
    onChange({
      ...filters,
      eventTypes: filters.eventTypes.includes(eventType)
        ? filters.eventTypes.filter((value) => value !== eventType)
        : [...filters.eventTypes, eventType],
    });
  };

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-archive-50">Timeline filters</Text>
          <Text className="text-xs text-archive-300">
            {resultCount} loaded {resultCount === 1 ? 'event' : 'events'} shown
          </Text>
        </View>
        <Button
          className="min-h-10 px-3"
          title={expanded ? 'Done' : 'Filter'}
          variant="secondary"
          onPress={() => setExpanded((current) => !current)}
        />
      </View>

      <TextField
        accessibilityLabel="Search loaded Timeline events"
        onChangeText={(query) => onChange({ ...filters, query })}
        placeholder="Search Timeline"
        value={filters.query}
      />

      {expanded ? (
        <View className="gap-4 border-t border-archive-700 pt-4">
          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Media</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="All" selected={filters.mediaType === 'all'} onPress={() => onChange({ ...filters, mediaType: 'all' })} />
              {(['movie', 'series', 'anime'] as const).map((mediaType) => (
                <Pill key={mediaType} label={MEDIA_TYPE_LABELS[mediaType]} selected={filters.mediaType === mediaType} onPress={() => onChange({ ...filters, mediaType })} />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Activity</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="Started" selected={filters.eventTypes.includes('started')} onPress={() => toggleEvent('started')} />
              <Pill label="Watched / finished" selected={filters.eventTypes.includes('completed')} onPress={() => toggleEvent('completed')} />
              <Pill label="Stopped" selected={filters.eventTypes.includes('stopped')} onPress={() => toggleEvent('stopped')} />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Rating</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="Any" selected={filters.rating === 'any'} onPress={() => onChange({ ...filters, rating: 'any' })} />
              <Pill label="Rated" selected={filters.rating === 'rated'} onPress={() => onChange({ ...filters, rating: 'rated' })} />
              <Pill label="Unrated" selected={filters.rating === 'unrated'} onPress={() => onChange({ ...filters, rating: 'unrated' })} />
              <Pill label="4+" selected={filters.rating === 'gte_4'} onPress={() => onChange({ ...filters, rating: 'gte_4' })} />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Date</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="All" selected={filters.date === 'all'} onPress={() => onChange({ ...filters, date: 'all' })} />
              <Pill label="This month" selected={filters.date === 'this_month'} onPress={() => onChange({ ...filters, date: 'this_month' })} />
              <Pill label="Last 30 days" selected={filters.date === 'last_30_days'} onPress={() => onChange({ ...filters, date: 'last_30_days' })} />
              <Pill label="This year" selected={filters.date === 'this_year'} onPress={() => onChange({ ...filters, date: 'this_year' })} />
            </View>
          </View>

          <Button title="Clear filters" variant="ghost" onPress={() => onChange(DEFAULT_TIMELINE_FILTERS)} />
        </View>
      ) : null}
    </Card>
  );
}
