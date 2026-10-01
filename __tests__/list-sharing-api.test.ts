import { getSharedList, manageListSharing, SharedListUnavailableError } from '@/features/sharing/api/list-sharing-api';

const mockInvoke = jest.fn();
jest.mock('@/lib/supabase/client', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));
beforeEach(() => mockInvoke.mockReset());
afterEach(() => jest.useRealTimers());

it('keeps unavailable separate from retryable service failures', async () => {
  mockInvoke.mockResolvedValueOnce({ data: null, error: { context: new Response(null, { status: 404 }) } });
  await expect(getSharedList('a'.repeat(64), null)).rejects.toBeInstanceOf(SharedListUnavailableError);
  mockInvoke.mockResolvedValueOnce({ data: null, error: { context: new Response(null, { status: 503 }), message: 'private request payload' } });
  await expect(getSharedList('a'.repeat(64), null)).rejects.toThrow('Check your connection');
});
it('reports stale version conflicts without silently retrying', async () => {
  mockInvoke.mockResolvedValue({ data: null, error: { context: new Response(null, { status: 409 }) } });
  await expect(manageListSharing({ listId: 'list', action: 'stop', expectedVersion: 1 })).rejects.toThrow('Sharing changed');
  expect(mockInvoke).toHaveBeenCalledTimes(1);
});
it('aborts requests that would otherwise leave sharing loading indefinitely', async () => {
  jest.useFakeTimers();
  mockInvoke.mockImplementation(() => new Promise(() => {}));
  const pending = getSharedList('a'.repeat(64), null);
  const assertion = expect(pending).rejects.toThrow('Sharing took too long');
  await jest.advanceTimersByTimeAsync(10_000);
  await assertion;
  expect(mockInvoke.mock.calls[0][1].signal.aborted).toBe(true);
});
