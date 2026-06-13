import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import type { JournalEntry } from '@/features/journal/types';

type TitleDetailsActionsProps = {
  addToListLoading?: boolean;
  canOpenJournalEntry: boolean;
  canOpenLists: boolean;
  entry: JournalEntry | null;
  journalEntryLoading: boolean;
  onOpenAddToList: () => void;
  onOpenJournalEntry: () => void;
  showAddToListPanel: boolean;
};

export function TitleDetailsActions({
  addToListLoading = false,
  canOpenJournalEntry,
  canOpenLists,
  entry,
  journalEntryLoading,
  onOpenAddToList,
  onOpenJournalEntry,
  showAddToListPanel,
}: TitleDetailsActionsProps) {
  return (
    <View className="gap-3">
      <Button
        title={entry ? 'Edit Entry' : 'Add to Journal'}
        disabled={!canOpenJournalEntry || journalEntryLoading}
        onPress={onOpenJournalEntry}
      />
      <Button
        title={showAddToListPanel ? 'Hide Lists' : 'Add to List'}
        variant="secondary"
        disabled={!canOpenLists || addToListLoading}
        loading={addToListLoading}
        onPress={onOpenAddToList}
      />
      {!canOpenLists ? (
        <Text className="text-center text-xs leading-4 text-archive-300">
          Sign in and wait for title details to finish loading before adding this title to lists.
        </Text>
      ) : null}
    </View>
  );
}
