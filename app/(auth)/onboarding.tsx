import { useLocalSearchParams } from 'expo-router';

import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';

export default function OnboardingRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return <OnboardingScreen returnTo={returnTo} />;
}
