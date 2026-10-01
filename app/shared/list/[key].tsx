import { useLocalSearchParams } from 'expo-router';
import { SharedListScreen } from '@/features/sharing/components/SharedListScreen';

export default function SharedListRoute() {
  const { key } = useLocalSearchParams<{ key?: string | string[] }>();
  return <SharedListScreen shareKey={Array.isArray(key) ? key[0] : key} />;
}
