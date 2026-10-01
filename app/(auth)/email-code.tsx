import { Redirect, useLocalSearchParams } from 'expo-router';

import { EMAIL_AUTH_ENABLED_FOR_LAUNCH } from '@/constants/app';
import { EmailCodeScreen } from '@/features/auth/components/EmailCodeScreen';
import { getPendingAuthReturnTo } from '@/features/auth/utils/pendingDestination';

export default function EmailCodeRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  if (!EMAIL_AUTH_ENABLED_FOR_LAUNCH) {
    const canonicalReturnTo = getPendingAuthReturnTo(returnTo);
    return (
      <Redirect
        href={canonicalReturnTo
          ? { pathname: '/welcome', params: { returnTo: canonicalReturnTo } }
          : '/welcome'}
      />
    );
  }

  return <EmailCodeScreen returnTo={returnTo} />;
}
