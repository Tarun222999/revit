import type { NormalizedMediaItem } from '@/types/media';

export type TitleShareIdentity =
  | {
      id: string;
      provider: 'tmdb';
      source: 'tmdb';
      sourceId: `movie:${string}` | `tv:${string}`;
      kind: 'movie' | 'tv';
      providerId: string;
    }
  | {
      id: string;
      provider: 'igdb';
      source: 'igdb';
      sourceId: string;
      kind: 'game';
      providerId: string;
    };

const POSITIVE_NUMERIC_ID = /^[1-9]\d*$/;

function requirePositiveProviderId(value: string) {
  if (!POSITIVE_NUMERIC_ID.test(value)) {
    throw new Error('A shareable title requires a positive numeric provider id.');
  }

  return value;
}

/** Returns a canonical provider-qualified ID without using Revit's internal UUID. */
export function createTitleShareId(
  item: Pick<NormalizedMediaItem, 'source' | 'sourceId'>,
) {
  const parsed = parseTitleShareId(
    item.source === 'tmdb' ? `tmdb:${item.sourceId}` : `igdb:${item.sourceId}`,
  );

  return parsed.id;
}

/** Creates the only public title-link format supported by the native app. */
export function createTitleShareUrl(
  item: Pick<NormalizedMediaItem, 'source' | 'sourceId'>,
) {
  return `revit://title/${encodeURIComponent(createTitleShareId(item))}`;
}

/** Strictly validates the decoded provider-qualified title segment. */
export function parseTitleShareId(value: string): TitleShareIdentity {
  const tmdbMatch = /^tmdb:(movie|tv):([1-9]\d*)$/.exec(value);

  if (tmdbMatch) {
    const [, kind, providerId] = tmdbMatch;
    return {
      id: value,
      provider: 'tmdb',
      source: 'tmdb',
      sourceId: `${kind}:${requirePositiveProviderId(providerId)}` as `movie:${string}` | `tv:${string}`,
      kind: kind as 'movie' | 'tv',
      providerId,
    };
  }

  const igdbMatch = /^igdb:([1-9]\d*)$/.exec(value);

  if (igdbMatch) {
    const providerId = requirePositiveProviderId(igdbMatch[1]);
    return {
      id: value,
      provider: 'igdb',
      source: 'igdb',
      sourceId: providerId,
      kind: 'game',
      providerId,
    };
  }

  throw new Error('This is not a valid Revit title link.');
}

export function tryParseTitleShareId(value: string | undefined) {
  if (!value) return null;

  try {
    return parseTitleShareId(value);
  } catch {
    return null;
  }
}

/** Parses a canonical app URL, rejecting extra path segments and query data. */
export function parseTitleShareUrl(value: string): TitleShareIdentity {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('This is not a valid Revit title link.');
  }

  if (
    url.protocol !== 'revit:' ||
    url.host !== 'title' ||
    url.search ||
    url.hash ||
    !/^\/[^/]+$/.test(url.pathname)
  ) {
    throw new Error('This is not a valid Revit title link.');
  }

  let decodedId: string;
  try {
    decodedId = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error('This is not a valid Revit title link.');
  }

  return parseTitleShareId(decodedId);
}

/** Identifies only canonical title URLs that AuthGate may leave public. */
export function isTitleSharePath(pathname: string) {
  const match = /^\/title\/([^/]+)$/.exec(pathname);

  if (!match) return false;

  try {
    return Boolean(parseTitleShareId(decodeURIComponent(match[1])));
  } catch {
    return false;
  }
}

/**
 * Keeps links that target the public title namespace out of AuthGate even
 * when malformed, so the anonymous resolver can return the approved calm
 * unavailable state instead of redirecting a recipient to Welcome.
 */
export function isPotentialTitleSharePath(pathname: string) {
  const match = /^\/title\/([^/]+)$/.exec(pathname);
  if (!match) return false;

  try {
    const value = decodeURIComponent(match[1]);
    return value.startsWith('tmdb:') || value.startsWith('igdb:');
  } catch {
    return false;
  }
}

/** Returns the decoded public-route segment without granting it validity. */
export function getPotentialTitleShareId(value: string | undefined) {
  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
