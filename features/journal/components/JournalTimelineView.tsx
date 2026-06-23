import { Text, View } from 'react-native';

import { JournalEntryCard } from '@/features/journal/components/JournalEntryCard';
import { getJournalTimelineGroups } from '@/features/journal/model/journalList';
import type { JournalListEntry, JournalSort } from '@/features/journal/types';

type JournalTimelineViewProps = {
  entries: JournalListEntry[];
  sort: JournalSort;
  onEntryPress: (entry: JournalListEntry) => void;
};

const timelineDayFormatter = new Intl.DateTimeFormat('en', {
  day: '2-digit',
});

const timelineMonthFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
});

function getTimelineDate(entry: JournalListEntry, sort: JournalSort) {
  return sort === 'recently_added' ? entry.createdAt : entry.lastActivityAt;
}

function TimelineDateMarker({
  entry,
  isLast,
  sort,
}: {
  entry: JournalListEntry;
  isLast: boolean;
  sort: JournalSort;
}) {
  const timelineDate = new Date(getTimelineDate(entry, sort));

  return (
    <View className="w-14 items-center self-stretch">
      <View className="h-12 w-12 items-center justify-center rounded-full border border-gold-500 bg-archive-800">
        <Text className="text-xs font-bold uppercase text-gold-300">
          {timelineMonthFormatter.format(timelineDate)}
        </Text>
        <Text className="text-base font-bold leading-5 text-archive-50">
          {timelineDayFormatter.format(timelineDate)}
        </Text>
      </View>
      <View
        className={
          isLast ? 'mt-2 w-px flex-1 bg-transparent' : 'mt-2 w-px flex-1 bg-archive-700'
        }
      />
    </View>
  );
}

export function JournalTimelineView({
  entries,
  sort,
  onEntryPress,
}: JournalTimelineViewProps) {
  const groups = getJournalTimelineGroups(entries, sort);

  return (
    <View className="gap-5">
      {groups.map((group) => (
        <View className="gap-4" key={group.key}>
          <View className="flex-row gap-3">
            <View className="w-14 items-center">
              <View className="h-2 w-2 rounded-full bg-gold-400" />
            </View>
            <Text className="min-w-0 flex-1 text-sm font-bold uppercase text-gold-300">
              {group.title}
            </Text>
          </View>

          <View>
            {group.entries.map((entry, entryIndex) => {
              const isLast = entryIndex === group.entries.length - 1;

              return (
                <View className="flex-row gap-3" key={entry.id}>
                  <TimelineDateMarker entry={entry} isLast={isLast} sort={sort} />
                  <View className="min-w-0 flex-1 pb-3">
                    <JournalEntryCard
                      entry={entry}
                      showActivityLabel={false}
                      sort={sort}
                      onPress={() => onEntryPress(entry)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
