import { useLocalSearchParams } from 'expo-router';

import { TitleDetailsScreen } from '@/features/media/components/TitleDetailsScreen';

export default function TitleDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <TitleDetailsScreen titleId={id} />;
}
