import { useLocalSearchParams } from 'expo-router';

import { JournalEntryModalScreen } from '@/features/journal/components/JournalEntryModalScreen';

export default function JournalEntryModalRoute() {
  const { entryId, mediaItemId } = useLocalSearchParams<{
    entryId?: string;
    mediaItemId?: string;
  }>();

  return (
    <JournalEntryModalScreen entryId={entryId} mediaItemId={mediaItemId} />
  );
}
