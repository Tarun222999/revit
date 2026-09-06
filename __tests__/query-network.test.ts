import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

import { configureOnlineManager } from '@/lib/query/network';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}));

const mockAddEventListener = jest.mocked(NetInfo.addEventListener);

describe('React Native query connectivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
  });

  it('updates TanStack Query when native connectivity changes', () => {
    const unsubscribe = jest.fn();
    mockAddEventListener.mockReturnValue(unsubscribe);

    const cleanup = configureOnlineManager();
    const listener = mockAddEventListener.mock.calls[0]?.[0];

    listener?.({ isConnected: false, isInternetReachable: false } as never);
    expect(onlineManager.isOnline()).toBe(false);

    listener?.({ isConnected: true, isInternetReachable: true } as never);
    expect(onlineManager.isOnline()).toBe(true);

    cleanup();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not report offline while internet reachability is still unknown', () => {
    mockAddEventListener.mockReturnValue(jest.fn());

    const cleanup = configureOnlineManager();
    const listener = mockAddEventListener.mock.calls[0]?.[0];

    listener?.({ isConnected: true, isInternetReachable: null } as never);
    expect(onlineManager.isOnline()).toBe(true);

    cleanup();
  });
});
