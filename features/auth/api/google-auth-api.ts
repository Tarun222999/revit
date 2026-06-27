import * as WebBrowser from 'expo-web-browser';

import { getAuthRedirectUrl } from '@/features/auth/utils/authRedirect';
import { supabase } from '@/lib/supabase/client';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error('Google sign-in did not return an auth URL.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success') {
    return null;
  }

  return result.url;
}
