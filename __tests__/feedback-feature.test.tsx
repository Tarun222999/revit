import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { submitFeedback } from '@/features/feedback/api/feedback-api';
import { FeedbackForm } from '@/features/feedback/components/FeedbackForm';
import { FeedbackModalScreen } from '@/features/feedback/components/FeedbackModalScreen';
import { HelpFeedbackScreen } from '@/features/feedback/components/HelpFeedbackScreen';
import {
  collectFeedbackContext,
  formatFeedbackReference,
  validateFeedbackMessage,
} from '@/features/feedback/model/feedbackForm';
import { JournalActionFeedback } from '@/features/journal/components/JournalActionFeedback';

const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn(() => ({ select: mockSelect }));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/feedback/hooks/useSubmitFeedback', () => ({
  useSubmitFeedback: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

const mockRouter = jest.requireMock('expo-router').router as {
  back: jest.Mock;
  push: jest.Mock;
  replace: jest.Mock;
};
const mockUseAuth = jest.requireMock('@/features/auth/hooks/useAuth')
  .useAuth as jest.Mock;
const mockUseSubmitFeedback = jest.requireMock(
  '@/features/feedback/hooks/useSubmitFeedback',
).useSubmitFeedback as jest.Mock;
const mockFrom = jest.requireMock('@/lib/supabase/client').supabase.from as jest.Mock;

const context = {
  appVersion: '1.3.0',
  buildNumber: '142',
  errorCode: null,
  osVersion: '16',
  platform: 'android',
  sourceScreen: 'help_feedback',
} as const;

describe('feedback model', () => {
  it('validates meaningful bounded messages', () => {
    expect(validateFeedbackMessage('   ')).toMatch(/Tell us/);
    expect(validateFeedbackMessage('x'.repeat(1201))).toMatch(/1200/);
    expect(validateFeedbackMessage('The Planner did not save.')).toBeNull();
  });

  it('formats a short receipt and allowlists safe context', () => {
    expect(formatFeedbackReference('12ab34cd-5678-4000-8000-000000000000')).toBe(
      'RV-12AB34CD',
    );

    expect(
      collectFeedbackContext({
        errorCode: 'remove_plan_failed',
        sourceScreen: 'journal_planner',
      }),
    ).toMatchObject({
      errorCode: 'remove_plan_failed',
      sourceScreen: 'journal_planner',
    });
  });
});

describe('feedback API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it('submits only the approved payload and returns the receipt id', async () => {
    mockSingle.mockResolvedValue({
      data: { id: '12ab34cd-5678-4000-8000-000000000000' },
      error: null,
    });

    await expect(
      submitFeedback({
        category: 'bug',
        contactAllowed: true,
        context: { ...context, errorCode: 'remove_plan_failed' },
        message: '  Planner could not remove a plan.  ',
        userId: 'user-1',
      }),
    ).resolves.toEqual({ id: '12ab34cd-5678-4000-8000-000000000000' });

    expect(mockFrom).toHaveBeenCalledWith('feedback_reports');
    expect(mockInsert).toHaveBeenCalledWith({
      app_version: '1.3.0',
      build_number: '142',
      category: 'bug',
      contact_allowed: true,
      error_code: 'remove_plan_failed',
      message: 'Planner could not remove a plan.',
      os_version: '16',
      platform: 'android',
      source_screen: 'help_feedback',
      user_id: 'user-1',
    });
    expect(mockSelect).toHaveBeenCalledWith('id');
  });

  it('rejects invalid feedback before calling Supabase', async () => {
    await expect(
      submitFeedback({
        category: 'other',
        contactAllowed: false,
        context,
        message: '   ',
        userId: 'user-1',
      }),
    ).rejects.toThrow(/Tell us/);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('feedback UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockUseSubmitFeedback.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    });
  });

  it('routes hub actions without adding feedback to every screen', async () => {
    await render(<HelpFeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Report a problem' }));
    expect(mockRouter.push).toHaveBeenCalledWith(
      '/modals/feedback?category=bug&source=help_feedback',
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Contact support' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/support');
  });

  it('connects accessible form controls to callbacks', async () => {
    const onCategoryChange = jest.fn();
    const onContactAllowedChange = jest.fn();
    const onMessageChange = jest.fn();

    await render(
      <FeedbackForm
        category="bug"
        contactAllowed={false}
        context={context}
        error={null}
        message="A short report"
        messageError={null}
        onCategoryChange={onCategoryChange}
        onContactAllowedChange={onContactAllowedChange}
        onMessageChange={onMessageChange}
        onSubmit={jest.fn()}
        submitting={false}
      />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Feature idea' }));
    await fireEvent.changeText(
      screen.getByLabelText('Tell us what happened'),
      'A clearer Planner action',
    );
    await fireEvent(
      screen.getByRole('switch', {
        name: 'Allow Revit to contact me about this report',
      }),
      'valueChange',
      true,
    );

    expect(onCategoryChange).toHaveBeenCalledWith('feature_idea');
    expect(onMessageChange).toHaveBeenCalledWith('A clearer Planner action');
    expect(onContactAllowedChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('14 / 1200')).toBeTruthy();
  });

  it('preserves the draft when submission fails', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('Network failed'));
    mockUseSubmitFeedback.mockReturnValue({ isPending: false, mutateAsync });

    await render(<FeedbackModalScreen category="bug" source="help_feedback" />);
    const messageInput = screen.getByLabelText('Tell us what happened');
    await fireEvent.changeText(messageInput, 'The retry action did nothing.');
    await fireEvent.press(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() =>
      expect(screen.getByText(/Your message is still here/)).toBeTruthy(),
    );
    expect(messageInput.props.value).toBe('The retry action did nothing.');
  });

  it('shows a stable receipt after a successful submission', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({
      id: '12ab34cd-5678-4000-8000-000000000000',
    });
    mockUseSubmitFeedback.mockReturnValue({ isPending: false, mutateAsync });

    await render(
      <FeedbackModalScreen category="feature_idea" source="help_feedback" />,
    );
    await fireEvent.changeText(
      screen.getByLabelText('What would make Revit better?'),
      'Let me duplicate one of my lists.',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() => expect(screen.getByText('Thanks for helping.')).toBeTruthy());
    expect(screen.getByText('RV-12AB34CD')).toBeTruthy();
  });

  it('provides a contextual reporting action only when requested', async () => {
    const onReport = jest.fn();
    const { rerender } = await render(
      <JournalActionFeedback
        body="Try again."
        onClose={jest.fn()}
        onReport={onReport}
        onRetry={jest.fn()}
        title="Could not remove plan"
        visible
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Report this problem' }));
    expect(onReport).toHaveBeenCalledTimes(1);

    await rerender(
      <JournalActionFeedback
        body="Try again."
        onClose={jest.fn()}
        onRetry={jest.fn()}
        title="Could not move plan"
        visible
      />,
    );
    expect(screen.queryByRole('button', { name: 'Report this problem' })).toBeNull();
  });
});
