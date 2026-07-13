import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { sendEmailOtp } from '../features/auth/api/email-auth-api';
import { EmailCodeScreen } from '../features/auth/components/EmailCodeScreen';

jest.mock('../features/auth/api/email-auth-api', () => ({
  sendEmailOtp: jest.fn(),
  verifyEmailOtp: jest.fn(),
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
});
