import { useLocalSearchParams } from 'expo-router';

import { WelcomeAuthScreen } from '@/features/auth/components/WelcomeAuthScreen';

export default function WelcomeAuthRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return <WelcomeAuthScreen returnTo={returnTo} />;
}
