import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { JournalPlannerView } from '@/features/journal/components/JournalPlannerView';
import { JournalTimelineView } from '@/features/journal/components/JournalTimelineView';

const mockPlannerQuery = {
  data: [
    {
      media: {
        id: 'media-1',
        imageUrl: null,
        mediaType: 'movie' as const,
        originalTitle: null,
        releaseDate: '2026-01-01',
        source: 'tmdb' as const,
        sourceId: 'movie:1',
        title: 'Virtualized title',
        year: '2026',
      },
      section: 'upcoming' as const,
      titleState: {
        activePlan: { plannedFor: '2026-08-01' },
        id: 'entry-1',
        mediaItemId: 'media-1',
        status: 'planned' as const,
        undatedCompletedCount: 0,
      },
    },
  ],
  isError: false,
  isLoading: false,
  refetch: jest.fn(),
};

jest.mock('@/features/journal/hooks/useJournalReads', () => ({
  useJournalPlanner: () => mockPlannerQuery,
}));

jest.mock('@/features/journal/hooks/useJournalLifecycleMutations', () => ({
  useRemoveJournalPlan: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useSaveJournalPlan: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));

describe('Journal growing collection virtualization', () => {
  it('renders Timeline pages with a FlatList', async () => {
    await render(
      <JournalTimelineView
        hasNextPage={false}
        header={<View testID="timeline-filters" />}
        isFetchingNextPage={false}
        items={[]}
        onItemPress={jest.fn()}
        onLoadMore={jest.fn()}
      />,
    );

    expect(screen.getByTestId('journal-timeline-list')).toBeTruthy();
  });

  it('renders Planner sections with a SectionList', async () => {
    await render(<JournalPlannerView userId="user-1" />);

    expect(screen.getByTestId('journal-planner-list')).toBeTruthy();
  });
});
