import { fireEvent, render, screen } from '@testing-library/react-native';

import { JournalPlannerView } from '@/features/journal/components/JournalPlannerView';
import type { JournalPlannerItem } from '@/features/journal/types';

const mockPush = jest.fn();
const mockRemovePlan = jest.fn();
const mockSavePlan = jest.fn();
let mockPlannerItems: JournalPlannerItem[] = [];

jest.mock('expo-router', () => ({ router: { push: mockPush } }));
jest.mock('@/features/journal/hooks/useJournalReads', () => ({
  useJournalPlanner: () => ({
    data: mockPlannerItems,
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/features/journal/hooks/useJournalLifecycleMutations', () => ({
  useRemoveJournalPlan: () => ({
    isPending: false,
    mutateAsync: mockRemovePlan,
  }),
  useSaveJournalPlan: () => ({ isPending: false, mutateAsync: mockSavePlan }),
}));

function plannerItem(
  section: JournalPlannerItem['section'],
): JournalPlannerItem {
  return {
    media: {
      id: `media-${section}`,
      imageUrl: null,
      mediaType: 'movie',
      originalTitle: null,
      releaseDate: '2026-01-01',
      source: 'tmdb',
      sourceId: `movie:${section}`,
      title: `${section} movie`,
      year: '2026',
    },
    section,
    titleState: {
      activePlan: { plannedFor: section === 'someday' ? null : '2026-08-10' },
      id: `entry-${section}`,
      mediaItemId: `media-${section}`,
      status: 'planned',
      undatedCompletedCount: 0,
    },
  };
}

describe('Planner card management actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlannerItems = [plannerItem('upcoming')];
    mockRemovePlan.mockResolvedValue(undefined);
    mockSavePlan.mockResolvedValue(undefined);
  });

  it('keeps the primary action visible and expands plan management on demand', async () => {
    await render(<JournalPlannerView userId="user-1" />);

    expect(screen.getByRole('button', { name: 'Log watch' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reschedule' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove plan' })).toBeNull();

    const more = screen.getByLabelText('Show plan actions for upcoming movie');
    expect(more.props.accessibilityRole).toBe('button');
    expect(more.props.accessibilityState).toEqual({
      disabled: false,
      expanded: false,
    });
    expect(more.props.hitSlop).toBe(4);

    await fireEvent.press(more);

    const close = screen.getByLabelText('Hide plan actions for upcoming movie');
    expect(close.props.accessibilityState.expanded).toBe(true);
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Move to Someday' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove plan' })).toBeTruthy();

    await fireEvent.press(close);
    expect(screen.queryByRole('button', { name: 'Reschedule' })).toBeNull();
  });

  it('shows section-specific actions for Someday without Move to Someday', async () => {
    mockPlannerItems = [plannerItem('someday')];
    await render(<JournalPlannerView userId="user-1" />);

    await fireEvent.press(
      screen.getByLabelText('Show plan actions for someday movie'),
    );

    expect(screen.getByRole('button', { name: 'Schedule' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Move to Someday' }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove plan' })).toBeTruthy();
  });

  it('moves any dated plan to Someday through the existing plan mutation', async () => {
    await render(<JournalPlannerView userId="user-1" />);

    await fireEvent.press(
      screen.getByLabelText('Show plan actions for upcoming movie'),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Move to Someday' }),
    );

    expect(mockSavePlan).toHaveBeenCalledWith({
      mediaItemId: 'media-upcoming',
      plannedFor: null,
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('uses the Revit confirmation surface before removing a plan', async () => {
    await render(<JournalPlannerView userId="user-1" />);

    await fireEvent.press(
      screen.getByLabelText('Show plan actions for upcoming movie'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Remove plan' }));

    const confirmation = screen.getByTestId('journal-action-confirmation');
    expect(confirmation).toBeTruthy();
    expect(confirmation.props.accessibilityViewIsModal).toBe(true);
    expect(
      screen.getByText(
        'This removes the plan only. Existing Journal history remains.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep plan' })).toBeTruthy();

    const removeButtons = screen.getAllByRole('button', {
      name: 'Remove plan',
    });
    await fireEvent.press(removeButtons[removeButtons.length - 1]);

    expect(mockRemovePlan).toHaveBeenCalledWith({
      journalEntryId: 'entry-upcoming',
    });
    expect(screen.queryByTestId('journal-action-confirmation')).toBeNull();
  });

  it('shows custom failure feedback and supports retrying plan removal', async () => {
    mockRemovePlan
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(undefined);

    await render(<JournalPlannerView userId="user-1" />);

    await fireEvent.press(
      screen.getByLabelText('Show plan actions for upcoming movie'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Remove plan' }));
    const removeButtons = screen.getAllByRole('button', {
      name: 'Remove plan',
    });
    await fireEvent.press(removeButtons[removeButtons.length - 1]);

    const feedback = screen.getByTestId('journal-action-feedback');
    expect(feedback).toBeTruthy();
    expect(feedback.props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Network unavailable')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(mockRemovePlan).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('journal-action-feedback')).toBeNull();
  });
});
