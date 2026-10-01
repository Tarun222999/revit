import * as Linking from 'expo-linking';

/**
 * This stays on the exact callback URL registered with Supabase Auth. A
 * validated share destination is kept locally instead of widening redirect
 * allow-lists to arbitrary callback query strings.
 */
export function getAuthRedirectUrl() {
  return Linking.createURL('/callback');
}
