import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { getCurrentProfile } from '../features/profile/api/profile-api';
import { sendEmailOtp, verifyEmailOtp } from '../features/auth/api/email-auth-api';
import { EmailCodeScreen } from '../features/auth/components/EmailCodeScreen';

jest.mock('../features/auth/api/email-auth-api', () => ({
  sendEmailOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
}));

jest.mock('../features/profile/api/profile-api', () => ({
  getCurrentProfile: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('email auth component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.removeItem).mockResolvedValue(undefined);
    jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  });

  it('rejects an invalid email without calling the auth API', async () => {
    await render(<EmailCodeScreen />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('you@example.com'),
      'not-an-email',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Send Code' }));

    await waitFor(() =>
      expect(screen.getAllByText('Enter a valid email address.').length).toBeGreaterThan(0),
    );
    expect(sendEmailOtp).not.toHaveBeenCalled();
  });

  it('shows the code step after a valid email is accepted', async () => {
    jest.mocked(sendEmailOtp).mockResolvedValue(undefined);

    await render(<EmailCodeScreen />);
    await fireEvent.changeText(
      screen.getByPlaceholderText('you@example.com'),
      'person@example.com',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Send Code' }));

    await waitFor(() => expect(screen.getByText('Check your inbox')).toBeTruthy());
    expect(sendEmailOtp).toHaveBeenCalledWith('person@example.com');
    expect(screen.getByPlaceholderText('123456')).toBeTruthy();
  });

  it('restores a stored shared title after OTP when route parameters are unavailable', async () => {
    jest.mocked(sendEmailOtp).mockResolvedValue(undefined);
    jest.mocked(verifyEmailOtp).mockResolvedValue({
      user: { id: 'user-1' },
    } as never);
    jest.mocked(getCurrentProfile).mockResolvedValue({ id: 'profile-1' } as never);

    await render(<EmailCodeScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'person@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send Code' }));
    await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeTruthy());

    jest.mocked(AsyncStorage.getItem).mockResolvedValue('revit://title/tmdb%3Atv%3A1396');
    await fireEvent.changeText(screen.getByPlaceholderText('123456'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Verify Code' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({
      pathname: '/title/[id]',
      params: { id: 'tmdb:tv:1396' },
    }));
  });
});
