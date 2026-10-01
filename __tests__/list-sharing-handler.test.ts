import type { SharedListPage } from '@/types/sharedList';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  createSharedListHandler,
  createManageListSharingHandler,
} = require('../supabase/functions/_shared/list-sharing-handler');
const key = 'ab'.repeat(32);
const listId = '00000000-0000-4000-8000-000000000001';
const page: SharedListPage = {
  name: 'Favorites',
  description: null,
  itemCount: 0,
  coverItems: [],
  items: [],
  nextCursor: null,
  isOwner: false,
};
const request = (body: unknown, method = 'POST') =>
  ({
    method,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
  }) as Request;

describe('shared list HTTP boundary', () => {
  it('allows anonymous reading and never caches a response', async () => {
    const resolve = jest.fn().mockResolvedValue(page);
    const handler = createSharedListHandler({
      allowRequest: () => true,
      viewer: async () => null,
      resolve,
    });
    const response = await handler(request({ key }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual(page);
    expect(resolve).toHaveBeenCalledWith(key, null, null);
  });
  it('returns the same unavailable response for malformed and missing grants', async () => {
    const resolve = jest.fn().mockResolvedValue(null);
    const handler = createSharedListHandler({
      allowRequest: () => true,
      viewer: async () => null,
      resolve,
    });
    const invalid = await handler(request({ key: 'bad' }));
    const missing = await handler(request({ key }));
    expect(invalid.status).toBe(404);
    expect(await invalid.json()).toEqual(await missing.json());
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(missing.headers.get('Cache-Control')).toBe('no-store');
  });
  it('throttles before doing resolution and does not leak raw exceptions', async () => {
    const resolve = jest.fn().mockRejectedValue(new Error(`secret ${key}`));
    const deps = {
      allowRequest: () => false,
      viewer: async () => null,
      resolve,
    };
    expect((await createSharedListHandler(deps)(request({ key }))).status).toBe(
      429,
    );
    expect(resolve).not.toHaveBeenCalled();
    const failed = await createSharedListHandler({
      ...deps,
      allowRequest: () => true,
    })(request({ key }));
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain(key);
  });
  it('uses the verified caller, ignoring owner identity in the body', async () => {
    const manage = jest.fn().mockResolvedValue({ version: 1, shareKey: key });
    const handler = createManageListSharingHandler({
      allowRequest: () => true,
      requireUser: async () => 'verified-user',
      manage,
    });
    const response = await handler(
      request({
        action: 'share',
        listId,
        expectedVersion: 0,
        userId: 'forged',
      }),
    );
    expect(response.status).toBe(200);
    expect(manage).toHaveBeenCalledWith(
      { action: 'share', listId, expectedVersion: 0 },
      'verified-user',
    );
  });
  it('requires a version for mutations and returns conflicts distinctly', async () => {
    const manage = jest.fn().mockResolvedValue({ code: 'sharing_conflict' });
    const handler = createManageListSharingHandler({
      allowRequest: () => true,
      requireUser: async () => 'owner',
      manage,
    });
    expect((await handler(request({ action: 'stop', listId }))).status).toBe(
      400,
    );
    expect(manage).not.toHaveBeenCalled();
    expect(
      (await handler(request({ action: 'stop', listId, expectedVersion: 1 })))
        .status,
    ).toBe(409);
  });
  it('denies failed authentication without invoking management', async () => {
    const manage = jest.fn();
    const handler = createManageListSharingHandler({
      allowRequest: () => true,
      requireUser: async () => {
        throw new Error('auth failed');
      },
      manage,
    });
    expect((await handler(request({ action: 'state', listId }))).status).toBe(
      500,
    );
    expect(manage).not.toHaveBeenCalled();
  });
});
