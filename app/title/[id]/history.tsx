import { useLocalSearchParams } from 'expo-router';

import { JournalHistoryScreen } from '@/features/journal/components/JournalHistoryScreen';

export default function TitleHistoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <JournalHistoryScreen titleId={id} />;
}
