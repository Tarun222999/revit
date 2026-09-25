import * as Linking from 'expo-linking';

export function getAuthRedirectUrl(returnTo?: string) {
  return Linking.createURL('/callback', {
    queryParams: returnTo ? { returnTo } : undefined,
  });
}
