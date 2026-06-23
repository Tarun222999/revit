import { Redirect } from 'expo-router';

import { EMAIL_AUTH_ENABLED_FOR_LAUNCH } from '@/constants/app';
import { EmailCodeScreen } from '@/features/auth/components/EmailCodeScreen';

export default function EmailCodeRoute() {
  if (!EMAIL_AUTH_ENABLED_FOR_LAUNCH) {
    return <Redirect href="/welcome" />;
  }

  return <EmailCodeScreen />;
}
