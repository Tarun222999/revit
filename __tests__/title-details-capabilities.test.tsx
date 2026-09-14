import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { TitleDetailsScreen } from '@/features/media/components/TitleDetailsScreen';
import type { JournalTitleSummary } from '@/features/journal/types';
import type { NormalizedMediaItem } from '@/types/media';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseAppCapabilities = jest.fn();
const mockUseAuth = jest.fn();
const mockUseJournalTitleSummary = jest.fn();
const mockUseMediaDetails = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  Stack: { Screen: () => null },
}));

jest.mock('@/components/ui/Screen', () => ({
  Screen: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/features/capabilities/context/AppCapabilitiesProvider', () => ({
  useAppCapabilities: () => mockUseAppCapabilities(),
}));

jest.mock('@/features/media/hooks/useMediaDetails', () => ({
  useMediaDetails: () => mockUseMediaDetails(),
}));

jest.mock('@/features/media/hooks/useMediaTrailer', () => ({
  useMediaTrailer: () => ({ data: undefined }),
}));

jest.mock('@/features/journal/hooks/useJournalReads', () => ({
  useJournalTitleSummary: () => mockUseJournalTitleSummary(),
}));

jest.mock('@/features/journal/hooks/useJournalLifecycleMutations', () => ({
  useRemoveJournalPlan: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useRemoveJournalTitle: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));

jest.mock('@/features/lists/hooks/useMediaListMemberships', () => ({
  useMediaListMemberships: () => ({ isLoading: false }),
}));

jest.mock('@/features/journal/components/TitleDetailsJournalActions', () => ({
  TitleDetailsJournalActions: () => null,
}));

jest.mock('@/features/journal/components/JournalActionConfirmation', () => ({
  JournalActionConfirmation: () => null,
}));

jest.mock('@/features/media/components/TitleDetailsHero', () => ({
  TitleDetailsHero: () => null,
  TitleDetailsHeroLoading: () => null,
}));

jest.mock('@/features/media/components/TitleDetailsMetadataCard', () => ({
  TitleDetailsMetadataCard: () => null,
}));

jest.mock('@/features/media/components/TitleDetailsSummaryCard', () => ({
  TitleDetailsSummaryCard: () => null,
}));

jest.mock('@/features/media/components/GameTitleDetailsContent', () => ({
  GameTitleDetailsContent: () => null,
}));

const game: NormalizedMediaItem = {
  id: 'media-game',
  genres: [],
  mediaType: 'game',
  metadata: {},
  source: 'igdb',
  sourceId: '42',
  title: 'Tidebound',
};

function gameHistory(): JournalTitleSummary {
  return {
    activityCount: 1,
    completedWatchCount: 1,
    latestCompletedEvent: {
      eventDate: '2026-08-10',
      id: 'event-1',
      journalEntryId: 'entry-1',
      notes: null,
      rating: null,
      type: 'completed',
    },
    titleState: {
      activePlan: null,
      id: 'entry-1',
      mediaItemId: 'media-game',
      status: 'completed',
      undatedCompletedCount: 0,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAppCapabilities.mockReturnValue({ gamesEnabled: false });
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
  mockUseMediaDetails.mockReturnValue({
    data: { item: game },
    isError: false,
    isLoading: false,
  });
  mockUseJournalTitleSummary.mockReturnValue({
    data: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
  });
});

describe('Title Details game capability boundaries', () => {
  it('does not open a new Journal flow for an untracked game while Games is disabled', async () => {
    await render(<TitleDetailsScreen titleId="igdb:42" />);

    const summary = screen.getByLabelText('Your Journal. Nothing recorded yet.');
    await fireEvent.press(summary);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('keeps persisted game history readable while new game mutations are disabled', async () => {
    mockUseJournalTitleSummary.mockReturnValue({
      data: gameHistory(),
      isError: false,
      isLoading: false,
      isSuccess: true,
    });

    await render(<TitleDetailsScreen titleId="igdb:42" />);
    await fireEvent.press(
      screen.getByRole('button', { name: /Your Journal\./ }),
    );

    expect(mockPush).toHaveBeenCalledWith('/title/igdb%3A42/history');
  });
});
