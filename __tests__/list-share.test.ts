import {
  createListShareUrl,
  parseListShareUrl,
  parseListShareKey,
  getSharedListAuthReturnTo,
  isPotentialListSharePath,
} from '@/features/sharing/model/listShare';
import {
  getPendingAuthDestination,
  getPendingAuthReturnTo,
  storePendingAuthReturnTo,
  getStoredPendingAuthReturnTo,
} from '@/features/auth/utils/pendingDestination';

const key = 'ab'.repeat(32);
describe('opaque list share URLs', () => {
  it('roundtrips only the canonical 256-bit key URL', () => {
    expect(parseListShareUrl(createListShareUrl(key))).toBe(key);
    expect(getSharedListAuthReturnTo(`/shared/list/${key}`)).toBe(
      createListShareUrl(key),
    );
  });
  it.each([
    '',
    'a'.repeat(63),
    'a'.repeat(65),
    'AB'.repeat(32),
    'g'.repeat(64),
    'list-id',
  ])('rejects invalid keys: %s', (value) => {
    expect(() => parseListShareKey(value)).toThrow();
  });
  it.each([
    `https://shared/list/${key}`,
    `revit://shared/list/${key}/`,
    `revit://shared/list/${key}?`,
    `revit://shared/list/${key}#`,
    `revit://shared/list/${key}/other`,
    `revit://user@shared/list/${key}`,
    `revit://shared/list/../list/${key}`,
    `revit://shared/list/%61${key.slice(1)}`,
  ])('rejects alternate URL forms: %s', (value) => {
    expect(() => parseListShareUrl(value)).toThrow();
    expect(getPendingAuthReturnTo(value)).toBeNull();
  });
  it('preserves a list destination across process-independent auth storage', async () => {
    await storePendingAuthReturnTo(createListShareUrl(key));
    expect(await getStoredPendingAuthReturnTo()).toBe(createListShareUrl(key));
    expect(getPendingAuthDestination(createListShareUrl(key))).toEqual({
      pathname: '/shared/list/[key]',
      params: { key },
    });
  });
  it('allows unavailable handling only in the public list namespace', () => {
    expect(isPotentialListSharePath('/shared/list/bad')).toBe(true);
    expect(isPotentialListSharePath('/lists/private')).toBe(false);
    expect(isPotentialListSharePath('/shared/listing/private')).toBe(false);
    expect(getSharedListAuthReturnTo('/shared/list/bad')).toBeNull();
    expect(getPendingAuthDestination('https://example.com')).toBeNull();
  });
});
