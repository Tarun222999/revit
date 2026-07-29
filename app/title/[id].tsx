import { useLocalSearchParams } from 'expo-router';

import { TitleDetailsScreen } from '@/features/media/components/TitleDetailsScreen';

export default function TitleDetailsRoute() {
  const { id, journalCapture, journalReturn } = useLocalSearchParams<{
    id: string;
    journalCapture?: string;
    journalReturn?: string;
  }>();

  return (
    <TitleDetailsScreen
      journalCapture={journalCapture}
      journalReturn={journalReturn === 'true'}
      titleId={id}
    />
  );
}
