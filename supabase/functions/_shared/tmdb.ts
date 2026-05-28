import { HttpError } from './cors.ts';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

function getTmdbAccessToken() {
  const token = Deno.env.get('TMDB_ACCESS_TOKEN');

  if (!token) {
    throw new HttpError(500, 'TMDB is not configured.');
  }

  return token;
}

export function buildTmdbImageUrl(
  path: string | null | undefined,
  size = 'w500',
) {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export async function fetchTmdb<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getTmdbAccessToken()}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('TMDB request failed', response.status, detail);
    throw new HttpError(502, 'Unable to load media data right now.');
  }

  return response.json();
}
