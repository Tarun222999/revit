import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import {
  getFeedbackErrorMessage,
  submitFeedback,
} from '@/features/feedback/api/feedback-api';
import { FeedbackModalScreen } from '@/features/feedback/components/FeedbackModalScreen';
import { useSubmitFeedback } from '@/features/feedback/hooks/useSubmitFeedback';
import type { SubmitFeedbackInput } from '@/features/feedback/types';
import { useAuth } from '@/features/auth/hooks/useAuth';

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/feedback/api/feedback-api', () => {
  const actual = jest.requireActual('@/features/feedback/api/feedback-api');
  return { ...actual, submitFeedback: jest.fn() };
});

const mockSubmitFeedback = jest.mocked(submitFeedback);
const mockUseAuth = jest.mocked(useAuth);

const input: SubmitFeedbackInput = {
  category: 'bug',
  contactAllowed: false,
  context: {
    appVersion: '1.3.0',
    buildNumber: '451',
    errorCode: null,
    osVersion: '16',
    platform: 'android',
    sourceScreen: 'help_feedback',
  },
  message: 'The planner did not save.',
  userId: 'user-1',
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('feedback mutation connectivity', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } } as ReturnType<
      typeof useAuth
    >);
    queryClient = new QueryClient({
      defaultOptions: { mutations: { gcTime: Infinity, retry: false } },
    });
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    queryClient.clear();
  });

  it('fails immediately while offline without pausing or submitting after reconnect', async () => {
    onlineManager.setOnline(false);
    const { result, unmount } = await renderHook(() => useSubmitFeedback(), {
      wrapper: createWrapper(queryClient),
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync(input);
      } catch (error) {
        thrown = error;
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
    expect(getFeedbackErrorMessage(thrown)).toMatch(/offline/i);

    await act(async () => {
      onlineManager.setOnline(true);
      await Promise.resolve();
    });

    expect(mockSubmitFeedback).not.toHaveBeenCalled();
    await unmount();
  });

  it('preserves the draft and lets the user retry explicitly after reconnecting', async () => {
    onlineManager.setOnline(false);
    mockSubmitFeedback.mockResolvedValue({
      id: '12ab34cd-5678-4000-8000-000000000000',
    });
    await render(<FeedbackModalScreen category="bug" source="help_feedback" />, {
      wrapper: createWrapper(queryClient),
    });
    const messageInput = screen.getByLabelText('Tell us what happened');

    await fireEvent.changeText(messageInput, input.message);
    await fireEvent.press(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() => expect(screen.getByText(/You’re offline/)).toBeTruthy());
    expect(messageInput.props.value).toBe(input.message);
    expect(mockSubmitFeedback).not.toHaveBeenCalled();

    await act(async () => {
      onlineManager.setOnline(true);
      await Promise.resolve();
    });
    expect(mockSubmitFeedback).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(screen.getByText('Thanks for helping.')).toBeTruthy());
    expect(mockSubmitFeedback).toHaveBeenCalledTimes(1);
  });
});
