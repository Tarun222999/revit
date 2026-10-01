import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { logJournalEvent } from '@/features/journal/api/journal-mutation-api';
import {
  invalidateJournalReadData,
  reconcileJournalPlannerCache,
} from '@/features/journal/api/journal-query-keys';
import { useLogJournalEvent } from '@/features/journal/hooks/useJournalLifecycleMutations';

jest.mock('@/features/journal/api/journal-mutation-api', () => ({
  deleteJournalEvent: jest.fn(),
  logJournalEvent: jest.fn(),
  removeJournalPlan: jest.fn(),
  removeJournalTitle: jest.fn(),
  saveJournalPlan: jest.fn(),
  updateJournalEvent: jest.fn(),
}));

jest.mock('@/features/journal/api/journal-query-keys', () => ({
  invalidateJournalReadData: jest.fn(),
  reconcileJournalPlannerCache: jest.fn(),
}));

const mockLogJournalEvent = jest.mocked(logJournalEvent);
const mockInvalidateJournalReadData = jest.mocked(invalidateJournalReadData);
const mockReconcileJournalPlannerCache = jest.mocked(
  reconcileJournalPlannerCache,
);

function createHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

const input = {
  eventDate: '2026-07-29',
  intent: 'complete' as const,
  mediaItemId: 'media-1',
  notes: '',
  rating: 4.5,
  requestId: '30000000-0000-4000-8000-000000000020',
  source: 'planner' as const,
  today: '2026-07-29',
};

describe('Journal lifecycle mutation hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateJournalReadData.mockResolvedValue();
  });

  it('refreshes purpose-specific and staged legacy reads after success', async () => {
    mockLogJournalEvent.mockResolvedValue({
      affectedDates: ['2026-07-29', '2026-08-01'],
      eventId: 'event-1',
      idempotentReplay: false,
      journalEntryId: 'entry-1',
      mediaItemId: 'media-1',
      titleDeleted: false,
      userId: 'user-1',
    });
    const { queryClient, wrapper } = createHarness();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result, unmount } = await renderHook(() => useLogJournalEvent(), {
      wrapper,
    });

    await act(async () => result.current.mutateAsync(input));

    expect(mockInvalidateJournalReadData).toHaveBeenCalledWith(queryClient, {
      affectedDates: ['2026-07-29', '2026-08-01'],
      eventId: 'event-1',
      journalEntryId: 'entry-1',
      mediaItemId: 'media-1',
      userId: 'user-1',
    });
    expect(mockReconcileJournalPlannerCache).toHaveBeenCalledWith(queryClient, {
      journalEntryId: 'entry-1',
      mediaItemId: 'media-1',
      userId: 'user-1',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['journal', 'entries', 'user-1'],
    });
    await unmount();
    queryClient.clear();
  });

  it('keeps caches unchanged when the atomic operation fails', async () => {
    mockLogJournalEvent.mockRejectedValue(new Error('Could not log watch'));
    const { queryClient, wrapper } = createHarness();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result, unmount } = await renderHook(() => useLogJournalEvent(), {
      wrapper,
    });

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow(
        'Could not log watch',
      );
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockInvalidateJournalReadData).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    await unmount();
    queryClient.clear();
  });
});
