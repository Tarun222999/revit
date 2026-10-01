import { useLocalSearchParams } from 'expo-router';

import { AuthCallbackScreen } from '@/features/auth/components/AuthCallbackScreen';

export default function AuthCallbackRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return <AuthCallbackScreen returnTo={returnTo} />;
}
