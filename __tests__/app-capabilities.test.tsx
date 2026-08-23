import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getAppCapabilities } from '@/features/capabilities/api/app-capabilities-api';
import {
  AppCapabilitiesProvider,
  getCapabilityRefreshInterval,
  useAppCapabilities,
} from '@/features/capabilities/context/AppCapabilitiesProvider';

jest.mock('@/features/capabilities/api/app-capabilities-api', () => ({
  getAppCapabilities: jest.fn(),
}));

const mockGetAppCapabilities = jest.mocked(getAppCapabilities);

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <AppCapabilitiesProvider>{children}</AppCapabilitiesProvider>
      </QueryClientProvider>
    );
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

describe('AppCapabilitiesProvider', () => {
  beforeEach(() => {
    mockGetAppCapabilities.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('fails closed while the capability request is unresolved', async () => {
    mockGetAppCapabilities.mockReturnValue(new Promise(() => undefined));
    const queryClient = createQueryClient();
    const { result, unmount } = await renderHook(() => useAppCapabilities(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.gamesEnabled).toBe(false);
    expect(result.current.isResolved).toBe(false);

    unmount();
    queryClient.clear();
  });

  it('publishes the resolved server capability', async () => {
    mockGetAppCapabilities.mockResolvedValue({ gamesEnabled: true });
    const queryClient = createQueryClient();
    const { result, unmount } = await renderHook(() => useAppCapabilities(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.gamesEnabled).toBe(true);

    unmount();
    queryClient.clear();
  });

  it('stays disabled after a capability request failure', async () => {
    mockGetAppCapabilities.mockRejectedValue(new Error('offline'));
    const queryClient = createQueryClient();
    const { result, unmount } = await renderHook(() => useAppCapabilities(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.gamesEnabled).toBe(false);
    expect(result.current.isResolved).toBe(false);

    unmount();
    queryClient.clear();
  });

  it('refreshes the capability when the app returns to the foreground', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });
    mockGetAppCapabilities.mockResolvedValue({ gamesEnabled: false });
    const queryClient = createQueryClient();
    const { result, unmount } = await renderHook(() => useAppCapabilities(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isResolved).toBe(true));

    await act(async () => {
      appStateListener?.('active');
    });

    await waitFor(() => expect(mockGetAppCapabilities).toHaveBeenCalledTimes(2));

    unmount();
    queryClient.clear();
  });

  it('disables a previously enabled capability while refresh is pending', async () => {
    let resolveRefresh: ((value: { gamesEnabled: boolean }) => void) | undefined;
    mockGetAppCapabilities
      .mockResolvedValueOnce({ gamesEnabled: true })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
      );
    const queryClient = createQueryClient();
    const { result, unmount } = await renderHook(() => useAppCapabilities(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.gamesEnabled).toBe(true));

    await act(async () => {
      void result.current.refresh();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    expect(result.current.gamesEnabled).toBe(false);

    await act(async () => {
      resolveRefresh?.({ gamesEnabled: false });
    });

    expect(result.current.gamesEnabled).toBe(false);
    unmount();
    queryClient.clear();
  });

  it('disables a previously enabled capability after refresh failure', async () => {
    mockGetAppCapabilities
      .mockResolvedValueOnce({ gamesEnabled: true })
      .mockRejectedValueOnce(new Error('offline'));
    const queryClient = createQueryClient();
    const { result, unmount } = await renderHook(() => useAppCapabilities(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.gamesEnabled).toBe(true));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.gamesEnabled).toBe(false);
    unmount();
    queryClient.clear();
  });

  it('stops interval refreshes in the background and cleans up its listener', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener;
      return { remove };
    });
    mockGetAppCapabilities.mockResolvedValue({ gamesEnabled: false });
    const queryClient = createQueryClient();
    const { unmount } = await renderHook(() => useAppCapabilities(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(mockGetAppCapabilities).toHaveBeenCalledTimes(1));
    await act(async () => {
      appStateListener?.('background');
    });
    const callsBeforeBackgroundWait = mockGetAppCapabilities.mock.calls.length;

    jest.useFakeTimers();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    expect(mockGetAppCapabilities).toHaveBeenCalledTimes(callsBeforeBackgroundWait);
    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });

  it('schedules polling only while the app is active', () => {
    expect(getCapabilityRefreshInterval(true)).toBe(5 * 60 * 1000);
    expect(getCapabilityRefreshInterval(false)).toBe(false);
  });
});
