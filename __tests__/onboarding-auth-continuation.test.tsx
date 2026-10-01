import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useCreateProfile } from '@/features/profile/hooks/useCreateProfile';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    signOut: jest.fn(),
    user: { id: 'user-1' },
  })),
}));

jest.mock('@/features/profile/hooks/useCreateProfile', () => ({
  useCreateProfile: jest.fn(),
}));

jest.mock('@/features/profile/api/profile-api', () => ({
  normalizeUsername: (value: string) => value.trim().toLowerCase(),
  uploadProfileAvatar: jest.fn(),
  validateDisplayName: (value: string) => value.trim() ? null : 'Enter a display name.',
  validateUsername: (value: string) => value.trim() ? null : 'Enter a username.',
}));

describe('onboarding shared-title continuation', () => {
  const mutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue({ id: 'user-1' });
    jest.mocked(useCreateProfile).mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useCreateProfile>);
    jest.mocked(AsyncStorage.getItem).mockResolvedValue('revit://title/igdb%3A1942');
    jest.mocked(AsyncStorage.removeItem).mockResolvedValue(undefined);
  });

  it('uses the stored title captured before profile creation when route params are absent', async () => {
    await render(<OnboardingScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Your name'), 'Maya');
    await fireEvent.changeText(screen.getByPlaceholderText('revit_reader'), 'maya_reader');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      avatarPath: null,
      displayName: 'Maya',
      userId: 'user-1',
      username: 'maya_reader',
    }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/title/[id]',
      params: { id: 'igdb:1942' },
    });
  });
});
