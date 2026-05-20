import { useLocalSearchParams } from 'expo-router';

import { ListDetailsScreen } from '@/features/lists/components/ListDetailsScreen';

export default function ListDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ListDetailsScreen listId={id} />;
}
