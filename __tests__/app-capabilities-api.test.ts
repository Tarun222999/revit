import {
  APP_CAPABILITIES_TIMEOUT_MS,
  getAppCapabilities,
} from '@/features/capabilities/api/app-capabilities-api';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const mockInvoke = jest.mocked(supabase.functions.invoke);

describe('getAppCapabilities', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a validated capability response', async () => {
    mockInvoke.mockResolvedValue({
      data: { gamesEnabled: true },
      error: null,
    } as never);

    await expect(getAppCapabilities()).resolves.toEqual({ gamesEnabled: true });
    expect(mockInvoke).toHaveBeenCalledWith('app-capabilities', { body: {} });
  });

  it.each([null, {}, { gamesEnabled: 'true' }])(
    'rejects malformed capability data: %p',
    async (data) => {
      mockInvoke.mockResolvedValue({ data, error: null } as never);

      await expect(getAppCapabilities()).rejects.toThrow(
        'The app capability response was invalid.',
      );
    },
  );

  it('fails closed through a bounded timeout when the request hangs', async () => {
    jest.useFakeTimers();
    mockInvoke.mockReturnValue(new Promise(() => undefined));

    const rejection = expect(getAppCapabilities()).rejects.toThrow(
      'The app capability request timed out.',
    );
    await jest.advanceTimersByTimeAsync(APP_CAPABILITIES_TIMEOUT_MS);

    await rejection;
  });
});
