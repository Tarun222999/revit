import { useLocalSearchParams } from 'expo-router';

import { JournalEntryModalScreen } from '@/features/journal/components/JournalEntryModalScreen';

export default function JournalEntryModalRoute() {
  const { eventId, intent, mediaItemId, source } = useLocalSearchParams<{
    eventId?: string;
    intent?: string;
    mediaItemId?: string;
    source?: string;
  }>();

  return (
    <JournalEntryModalScreen
      eventId={eventId}
      intent={intent}
      mediaItemId={mediaItemId}
      source={source}
    />
  );
}
