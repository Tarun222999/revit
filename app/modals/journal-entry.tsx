import { useLocalSearchParams } from 'expo-router';

import { JournalEntryModalScreen } from '@/features/journal/components/JournalEntryModalScreen';

export default function JournalEntryModalRoute() {
  const { eventId, intent, mediaItemId, returnToJournal, source } = useLocalSearchParams<{
    eventId?: string;
    intent?: string;
    mediaItemId?: string;
    returnToJournal?: string;
    source?: string;
  }>();

  return (
    <JournalEntryModalScreen
      eventId={eventId}
      intent={intent}
      mediaItemId={mediaItemId}
      returnToJournal={returnToJournal === 'true'}
      source={source}
    />
  );
}
