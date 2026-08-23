import type {
  IgdbAgeRating,
  IgdbGame,
  IgdbImageReference,
  IgdbNamedReference,
} from './igdb-types.ts';

/** Pure copy of the app-facing normalized media contract for edge modules. */
export type IgdbNormalizedMediaItem = {
  id?: string;
  source: 'tmdb' | 'igdb';
  sourceId: string;
  mediaType: 'movie' | 'series' | 'anime' | 'game';
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  releaseDate?: string | null;
  year?: string | null;
  imageUrl?: string | null;
  backdropUrl?: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
};

const IGDB_IMAGE_HOST = 'images.igdb.com';
const IGDB_IMAGE_PATH = '/igdb/image/upload/';
const COVER_IMAGE_SIZE = 't_cover_big';
const BACKDROP_IMAGE_SIZE = 't_1080p';

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const result = value.trim();
  return result.length > 0 ? result : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function integerId(value: unknown): number | null {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value)
        : null;

  return number !== null && Number.isSafeInteger(number) && number > 0
    ? number
    : null;
}

function toIsoDate(value: unknown): string | null {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())
        ? Number(value)
        : null;

  if (numericValue !== null && Number.isFinite(numericValue) && numericValue >= 0) {
    const date = new Date(
      numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue,
    );
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  const text = nonEmptyString(value);
  if (!text) {
    return null;
  }

  // IGDB normally returns epoch seconds, but accepting an ISO value makes the
  // mapper tolerant of cached/imported fixtures without accepting free-form
  // date strings that cannot be rendered deterministically.
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(text);
  if (!match) {
    return null;
  }

  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${match[1]}-${match[2]}-${match[3]}`
    ? null
    : date.toISOString().slice(0, 10);
}

/** Convert IGDB's protocol-relative/image-size URLs to stable HTTPS URLs. */
export function normalizeIgdbImageUrl(
  value: unknown,
  size: string,
): string | null {
  const raw = nonEmptyString(value);
  if (!raw) {
    return null;
  }

  const candidate = raw.startsWith('//')
    ? `https:${raw}`
    : raw.startsWith('http://')
      ? `https://${raw.slice('http://'.length)}`
      : raw;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.hostname !== IGDB_IMAGE_HOST) {
    return null;
  }

  if (!url.pathname.includes(IGDB_IMAGE_PATH)) {
    return null;
  }

  url.pathname = url.pathname.includes(`${IGDB_IMAGE_PATH}t_`)
    ? url.pathname.replace(/\/t_[^/]+(?=\/)/, `/${size}`)
    : url.pathname.replace(IGDB_IMAGE_PATH, `${IGDB_IMAGE_PATH}${size}/`);
  return url.toString();
}

function imageUrl(
  image: unknown,
  size: string,
): string | null {
  if (!isRecord(image)) {
    return null;
  }

  const fromUrl = normalizeIgdbImageUrl(image.url, size);
  if (fromUrl) {
    return fromUrl;
  }

  const imageId = nonEmptyString(image.image_id);
  return imageId && /^[A-Za-z0-9_-]+$/.test(imageId)
    ? `https://${IGDB_IMAGE_HOST}${IGDB_IMAGE_PATH}${size}/${imageId}.jpg`
    : null;
}

function firstImageUrl(
  images: unknown,
  size: string,
): string | null {
  if (!Array.isArray(images)) {
    return null;
  }

  for (const image of images) {
    const result = imageUrl(image, size);
    if (result) {
      return result;
    }
  }

  return null;
}

function names(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const name = nonEmptyString(
      typeof value === 'string' ? value : isRecord(value) ? value.name : null,
    );
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }

  return result;
}

function namedValue(value: unknown): { id?: number; name?: string; slug?: string } | number | null {
  const id = integerId(value);
  if (id !== null) {
    return id;
  }

  if (!isRecord(value)) {
    return null;
  }

  const result: { id?: number; name?: string; slug?: string } = {};
  const namedId = integerId(value.id);
  const name = nonEmptyString(value.name);
  const slug = nonEmptyString(value.slug);
  if (namedId !== null) result.id = namedId;
  if (name) result.name = name;
  if (slug) result.slug = slug;
  return Object.keys(result).length > 0 ? result : null;
}

function ratingCategoryValue(
  value: unknown,
): { id?: number; rating?: string } | number | null {
  const id = integerId(value);
  if (id !== null) {
    return id;
  }

  if (!isRecord(value)) {
    return null;
  }

  const result: { id?: number; rating?: string } = {};
  const relationId = integerId(value.id);
  // Legacy expanded `rating` records exposed `name`; current
  // `rating_category` records expose the human label as `rating`.
  const rating = nonEmptyString(value.rating) ?? nonEmptyString(value.name);
  if (relationId !== null) result.id = relationId;
  if (rating) result.rating = rating;
  return Object.keys(result).length > 0 ? result : null;
}

function ageRatings(values: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(values)) {
    return [];
  }

  const result: Array<Record<string, unknown>> = [];
  for (const value of values) {
    if (!isRecord(value)) {
      continue;
    }

    const ratingCategory = ratingCategoryValue(
      value.rating_category ?? value.rating,
    );
    const organization = namedValue(
      value.organization ?? value.category,
    );
    const item: Record<string, unknown> = {};
    const id = integerId(value.id);
    const synopsis = nonEmptyString(value.synopsis);
    const providerDescriptions = value.rating_content_descriptions ??
      value.content_descriptions;
    const contentDescriptions = Array.isArray(providerDescriptions)
      ? providerDescriptions
          .map((description) =>
            isRecord(description)
              ? nonEmptyString(description.description)
              : null,
          )
          .filter((description): description is string => Boolean(description))
      : [];
    if (id !== null) item.id = id;
    if (ratingCategory !== null) item.ratingCategory = ratingCategory;
    if (organization !== null) item.organization = organization;
    if (synopsis) item.synopsis = synopsis;
    if (contentDescriptions.length > 0) {
      item.contentDescriptions = contentDescriptions;
    }
    if (Object.keys(item).length > 0) result.push(item);
  }

  return result;
}

function optionalRatings(input: RecordValue, metadata: Record<string, unknown>) {
  const fields: Array<[string, string]> = [
    ['rating', 'rating'],
    ['aggregated_rating', 'aggregatedRating'],
    ['total_rating', 'totalRating'],
    ['rating_count', 'ratingCount'],
    ['aggregated_rating_count', 'aggregatedRatingCount'],
    ['popularity', 'popularity'],
  ];

  for (const [inputKey, outputKey] of fields) {
    const value = finiteNumber(input[inputKey]);
    if (value !== null) metadata[outputKey] = value;
  }
}

/**
 * Map an IGDB game to Revit's provider-neutral media shape.
 *
 * The provider/source pair is the identity boundary: sourceId deliberately
 * remains String(id), while `source: 'igdb'` prevents collisions with TMDB.
 * Missing optional provider fields are omitted from metadata rather than
 * represented by undefined values.  Invalid records without a usable ID are
 * ignored by returning null.
 */
export function normalizeIgdbGame(
  game: IgdbGame | null | undefined,
): IgdbNormalizedMediaItem | null {
  if (!isRecord(game)) {
    return null;
  }

  const id = integerId(game.id);
  if (id === null) {
    return null;
  }

  const releaseDate = toIsoDate(game.first_release_date);
  const metadata: Record<string, unknown> = { igdbId: id };
  const slug = nonEmptyString(game.slug);
  if (slug) metadata.igdbSlug = slug;
  optionalRatings(game, metadata);

  const platformNames = names(game.platforms);
  if (platformNames.length > 0) metadata.platforms = platformNames;

  const ratings = ageRatings(game.age_ratings);
  if (ratings.length > 0) metadata.ageRatings = ratings;

  const title = nonEmptyString(game.name) ?? 'Untitled game';
  const coverImageUrl = imageUrl(game.cover, COVER_IMAGE_SIZE);
  const backdropUrl =
    firstImageUrl(game.artworks, BACKDROP_IMAGE_SIZE) ??
    firstImageUrl(game.screenshots, BACKDROP_IMAGE_SIZE) ??
    imageUrl(game.cover, BACKDROP_IMAGE_SIZE);

  return {
    source: 'igdb',
    sourceId: String(id),
    mediaType: 'game',
    title,
    originalTitle: null,
    description: nonEmptyString(game.summary) ?? nonEmptyString(game.storyline),
    releaseDate,
    year: releaseDate ? releaseDate.slice(0, 4) : null,
    imageUrl: coverImageUrl,
    backdropUrl,
    genres: names(game.genres),
    metadata,
  };
}

// Keep these imports visible to consumers that use the canonical provider
// types while ensuring the mapper remains runtime-pure.
export type { IgdbAgeRating, IgdbGame, IgdbImageReference, IgdbNamedReference } from './igdb-types.ts';
