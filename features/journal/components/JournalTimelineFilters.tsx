import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { JournalActionDrawer } from '@/features/journal/components/JournalActionDrawer';
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
  const [draftFilters, setDraftFilters] = useState(filters);
  const openFilters = () => {
    setDraftFilters(filters);
    setExpanded(true);
  };
  const toggleEvent = (eventType: JournalEventType) => {
    setDraftFilters({
      ...draftFilters,
      eventTypes: draftFilters.eventTypes.includes(eventType)
        ? draftFilters.eventTypes.filter((value) => value !== eventType)
        : [...draftFilters.eventTypes, eventType],
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
          title="Filter"
          variant="secondary"
          onPress={openFilters}
        />
      </View>

      <TextField
        accessibilityLabel="Search loaded Timeline events"
        onChangeText={(query) => onChange({ ...filters, query })}
        placeholder="Search Timeline"
        value={filters.query}
      />

      <JournalActionDrawer
        actions={[]}
        description="Choose what belongs in your Timeline."
        footer={
          <View className="gap-2">
            <Button
              title="Apply filters"
              onPress={() => {
                onChange(draftFilters);
                setExpanded(false);
              }}
            />
            <Button
              title="Clear all"
              variant="ghost"
              onPress={() => setDraftFilters(DEFAULT_TIMELINE_FILTERS)}
            />
          </View>
        }
        onClose={() => setExpanded(false)}
        title="Filter Timeline"
        visible={expanded}>
        <View className="gap-4 border-t border-archive-700 pt-4">
          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Media</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="All" selected={draftFilters.mediaType === 'all'} onPress={() => setDraftFilters({ ...draftFilters, mediaType: 'all' })} />
              {(['movie', 'series', 'anime', 'game'] as const).map((mediaType) => (
                <Pill key={mediaType} label={MEDIA_TYPE_LABELS[mediaType]} selected={draftFilters.mediaType === mediaType} onPress={() => setDraftFilters({ ...draftFilters, mediaType })} />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Activity</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="Started" selected={draftFilters.eventTypes.includes('started')} onPress={() => toggleEvent('started')} />
              <Pill label="Watched / finished" selected={draftFilters.eventTypes.includes('completed')} onPress={() => toggleEvent('completed')} />
              <Pill label="Stopped" selected={draftFilters.eventTypes.includes('stopped')} onPress={() => toggleEvent('stopped')} />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Rating</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="Any" selected={draftFilters.rating === 'any'} onPress={() => setDraftFilters({ ...draftFilters, rating: 'any' })} />
              <Pill label="Rated" selected={draftFilters.rating === 'rated'} onPress={() => setDraftFilters({ ...draftFilters, rating: 'rated' })} />
              <Pill label="Unrated" selected={draftFilters.rating === 'unrated'} onPress={() => setDraftFilters({ ...draftFilters, rating: 'unrated' })} />
              <Pill label="4+" selected={draftFilters.rating === 'gte_4'} onPress={() => setDraftFilters({ ...draftFilters, rating: 'gte_4' })} />
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-bold uppercase text-archive-300">Date</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill label="All" selected={draftFilters.date === 'all'} onPress={() => setDraftFilters({ ...draftFilters, date: 'all' })} />
              <Pill label="This month" selected={draftFilters.date === 'this_month'} onPress={() => setDraftFilters({ ...draftFilters, date: 'this_month' })} />
              <Pill label="Last 30 days" selected={draftFilters.date === 'last_30_days'} onPress={() => setDraftFilters({ ...draftFilters, date: 'last_30_days' })} />
              <Pill label="This year" selected={draftFilters.date === 'this_year'} onPress={() => setDraftFilters({ ...draftFilters, date: 'this_year' })} />
            </View>
          </View>

        </View>
      </JournalActionDrawer>
    </Card>
  );
}
