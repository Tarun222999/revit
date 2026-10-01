import {
  createTitleShareId,
  createTitleShareUrl,
  getPotentialTitleShareId,
  isPotentialTitleSharePath,
  isTitleSharePath,
  parseTitleShareId,
  parseTitleShareUrl,
} from '@/features/sharing/model/titleShare';
import { getPendingAuthDestination } from '@/features/auth/utils/pendingDestination';
import type { NormalizedMediaItem } from '@/types/media';

function item(overrides: Partial<NormalizedMediaItem>): NormalizedMediaItem {
  return {
    source: 'tmdb',
    sourceId: 'movie:550',
    mediaType: 'movie',
    title: 'Example',
    genres: [],
    metadata: {},
    ...overrides,
  };
}

describe('provider-qualified title share contract', () => {
  it.each([
    [item({ source: 'tmdb', sourceId: 'movie:550' }), 'tmdb:movie:550'],
    [item({ source: 'tmdb', sourceId: 'tv:1396', mediaType: 'series' }), 'tmdb:tv:1396'],
    [item({ source: 'tmdb', sourceId: 'tv:37854', mediaType: 'anime' }), 'tmdb:tv:37854'],
    [item({ source: 'igdb', sourceId: '1942', mediaType: 'game' }), 'igdb:1942'],
  ])('creates the canonical identity for %s', (media, expected) => {
    expect(createTitleShareId(media)).toBe(expected);
    expect(createTitleShareUrl(media)).toBe(`revit://title/${encodeURIComponent(expected)}`);
  });

  it('keeps TMDB movie, TMDB television, and IGDB namespaces distinct', () => {
    expect(createTitleShareId(item({ sourceId: 'movie:42' }))).not.toBe(
      createTitleShareId(item({ sourceId: 'tv:42', mediaType: 'series' })),
    );
    expect(createTitleShareId(item({ sourceId: 'movie:42' }))).not.toBe(
      createTitleShareId(item({ source: 'igdb', sourceId: '42', mediaType: 'game' })),
    );
  });

  it.each([
    '',
    'tmdb:movie:0',
    'tmdb:tv:-1',
    'tmdb:movie:7:extra',
    'tmdb:anime:7',
    'igdb:0',
    'igdb:42:extra',
    'igdb:42 ',
  ])('rejects malformed provider identities: %s', (value) => {
    expect(() => parseTitleShareId(value)).toThrow();
  });

  it('accepts one encoded title path segment and rejects extra URL data', () => {
    const url = 'revit://title/tmdb%3Amovie%3A550';
    expect(parseTitleShareUrl(url)).toMatchObject({ sourceId: 'movie:550' });
    expect(() => parseTitleShareUrl(`${url}/other`)).toThrow();
    expect(() => parseTitleShareUrl(`${url}?sender=private`)).toThrow();
    expect(() => parseTitleShareUrl('https://title/tmdb%3Amovie%3A550')).toThrow();
  });

  it('allows malformed public-title paths to reach the unavailable state without exposing private paths', () => {
    expect(isTitleSharePath('/title/tmdb%3Atv%3A1396')).toBe(true);
    expect(isPotentialTitleSharePath('/title/tmdb%3Ainvalid')).toBe(true);
    expect(isPotentialTitleSharePath('/title/a-private-media-uuid')).toBe(false);
    expect(getPotentialTitleShareId('tmdb%3Ainvalid')).toBe('tmdb:invalid');
  });

  it('restores only a valid canonical title URL after authentication', () => {
    expect(getPendingAuthDestination('revit://title/igdb%3A1942')).toEqual({
      pathname: '/title/[id]',
      params: { id: 'igdb:1942' },
    });
    expect(getPendingAuthDestination('https://example.com/redirect')).toBeNull();
  });
});
