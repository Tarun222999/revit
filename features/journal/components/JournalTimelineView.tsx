import { Text, View } from 'react-native';

import { JournalEntryCard } from '@/features/journal/components/JournalEntryCard';
import { getJournalTimelineGroups } from '@/features/journal/model/journalList';
import type { JournalListEntry, JournalSort } from '@/features/journal/types';

type JournalTimelineViewProps = {
  entries: JournalListEntry[];
  sort: JournalSort;
  onEntryPress: (entry: JournalListEntry) => void;
};

export function JournalTimelineView({
  entries,
  sort,
  onEntryPress,
}: JournalTimelineViewProps) {
  const groups = getJournalTimelineGroups(entries, sort);

  return (
    <View className="gap-5">
      {groups.map((group) => (
        <View className="gap-3" key={group.key}>
          <Text className="text-sm font-bold uppercase text-gold-300">
            {group.title}
          </Text>

          <View className="gap-3">
            {group.entries.map((entry) => (
              <JournalEntryCard
                entry={entry}
                key={entry.id}
                sort={sort}
                onPress={() => onEntryPress(entry)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
