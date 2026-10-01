import { webcrypto } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  createListShareCursor,
} = require('../supabase/functions/_shared/list-share-cursor');
const key = 'a'.repeat(64);
const original = global.crypto;
beforeAll(() => {
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: webcrypto,
  });
});
afterAll(() => {
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: original,
  });
});

it('signs cursors and binds them to exactly one grant', async () => {
  const cursors = createListShareCursor(
    'cursor-secret-for-tests-at-least-32-characters',
  );
  const cursor = await cursors.encode(key, 40);
  expect(cursor).not.toContain(key);
  expect(await cursors.decode(key, cursor)).toBe(40);
  expect(await cursors.decode(key, null)).toBe(0);
  await expect(cursors.decode('b'.repeat(64), cursor)).rejects.toThrow();
  await expect(
    cursors.decode(key, cursor.replace('40.', '80.')),
  ).rejects.toThrow();
  await expect(cursors.decode(key, '40.' + '0'.repeat(64))).rejects.toThrow();
  await expect(
    cursors.decode(key, '100040.' + '0'.repeat(64)),
  ).rejects.toThrow();
  await expect(cursors.decode(key, '01.' + '0'.repeat(64))).rejects.toThrow();
});
it('rejects a weak signing secret', () => {
  expect(() => createListShareCursor('short')).toThrow();
});
