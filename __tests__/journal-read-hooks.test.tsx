import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { getJournalTitleSummary } from '@/features/journal/api/journal-read-api';
import { useJournalTitleSummary } from '@/features/journal/hooks/useJournalReads';

jest.mock('@/features/journal/api/journal-read-api', () => ({
  getJournalCalendarRange: jest.fn(),
  getJournalHistoryPage: jest.fn(),
  getJournalPlanner: jest.fn(),
  getJournalTimelinePage: jest.fn(),
  getJournalTitleSummary: jest.fn(),
}));

const mockGetJournalTitleSummary = jest.mocked(getJournalTitleSummary);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('v1.1 Journal title summary state', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enables title-state creation only after a successful missing-row result', async () => {
    let resolveSummary!: (value: null) => void;
    mockGetJournalTitleSummary.mockReturnValue(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );

    const { result } = await renderHook(
      () => useJournalTitleSummary('user-1', 'media-1'),
      { wrapper: createWrapper() },
    );

    expect(result.current.canCreateTitleState).toBe(false);
    await act(async () => resolveSummary(null));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.canCreateTitleState).toBe(true);
  });

  it('keeps duplicate-creating actions disabled when the read fails', async () => {
    mockGetJournalTitleSummary.mockRejectedValue(
      new Error('Journal state unavailable'),
    );

    const { result } = await renderHook(
      () => useJournalTitleSummary('user-1', 'media-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.canCreateTitleState).toBe(false);
  });
});
