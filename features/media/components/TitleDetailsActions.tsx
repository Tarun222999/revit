import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import type { JournalEntry } from '@/features/journal/types';

type TitleDetailsActionsProps = {
  canOpenJournalEntry: boolean;
  entry: JournalEntry | null;
  journalEntryLoading: boolean;
  onOpenJournalEntry: () => void;
};

export function TitleDetailsActions({
  canOpenJournalEntry,
  entry,
  journalEntryLoading,
  onOpenJournalEntry,
}: TitleDetailsActionsProps) {
  return (
    <View className="gap-3">
      <Button
        title={entry ? 'Edit Entry' : 'Add to Journal'}
        disabled={!canOpenJournalEntry || journalEntryLoading}
        onPress={onOpenJournalEntry}
      />
      <Button title="Add to List" variant="secondary" disabled />
      <Text className="text-center text-xs leading-4 text-archive-300">
        Lists arrive in Phase 6. This title can be added to lists after that
        flow exists.
      </Text>
    </View>
  );
}
