import * as Linking from 'expo-linking';

import { getAuthRedirectUrl } from '@/features/auth/utils/authRedirect';

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'revit://callback'),
}));

describe('auth redirect URL', () => {
  it('uses the exact registered callback URL without a continuation query', () => {
    expect(getAuthRedirectUrl()).toBe('revit://callback');
    expect(Linking.createURL).toHaveBeenCalledWith('/callback');
  });
});
