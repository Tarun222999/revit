import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';

function createNonce() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function isAppleSignInAvailable() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple() {
  const available = await isAppleSignInAvailable();

  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const nonce = createNonce();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });

  if (error) {
    throw error;
  }

  return data.session;
}
