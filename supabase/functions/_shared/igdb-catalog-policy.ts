import type { IgdbGame } from './igdb-types.ts';

/**
 * Increment this whenever catalog eligibility changes. Provider-backed caches
 * must reject entries written under a different policy version.
 */
export const IGDB_CATALOG_POLICY_VERSION = 'games-catalog-v1';

export const IGDB_EROTIC_THEME_ID = 42;

export const IGDB_INCLUDED_GAME_TYPES = [
  'main_game',
  'remake',
  'remaster',
] as const;

/** Stable IGDB relation IDs used for provider-side capacity filtering. */
export const IGDB_INCLUDED_GAME_TYPE_IDS = [0, 8, 9] as const;

export const IGDB_INCLUDED_GAME_STATUSES = [
  'released',
  'alpha',
  'beta',
  'early_access',
  'offline',
] as const;

/** Missing status is also eligible; these are the allowed populated IDs. */
export const IGDB_INCLUDED_GAME_STATUS_IDS = [0, 2, 3, 4, 5] as const;

const IGDB_EXCLUDED_GAME_STATUSES = ['cancelled', 'rumored', 'delisted'] as const;

export const IGDB_AGE_RATING_ORGANIZATION_PRIORITY = [
  'ESRB',
  'PEGI',
  'CERO',
  'USK',
  'GRAC',
  'CLASS_IND',
  'ACB',
] as const;

export type IgdbCatalogPolicyReason =
  | 'eligible'
  | 'invalid_identity'
  | 'erotic_theme'
  | 'edition_variant'
  | 'unknown_game_type'
  | 'excluded_game_type'
  | 'unknown_game_status'
  | 'excluded_game_status';

export type IgdbRatingStatus = 'unrated' | 'rated';

export type IgdbCatalogPolicyDecision = {
  eligible: boolean;
  policyVersion: typeof IGDB_CATALOG_POLICY_VERSION;
  reason: IgdbCatalogPolicyReason;
  ratingStatus: IgdbRatingStatus;
};

function normalizedLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function ratingStatus(game: IgdbGame): IgdbRatingStatus {
  if (!Array.isArray(game.age_ratings)) {
    return 'unrated';
  }

  const knownOrganizations = new Set<string>(
    IGDB_AGE_RATING_ORGANIZATION_PRIORITY,
  );
  const nonRatings = new Set([
    'unknown',
    'unrated',
    'not_rated',
    'rating_pending',
    'rp',
  ]);
  const hasUsableRating = game.age_ratings.some((ageRating) => {
    const organizationValue = ageRating?.organization ?? ageRating?.category;
    const organization = typeof organizationValue === 'object' && organizationValue
      ? organizationValue.name
      : null;
    const ratingValue = ageRating?.rating_category ?? ageRating?.rating;
    let rating: string | null = null;
    if (typeof ratingValue === 'object' && ratingValue) {
      if ('rating' in ratingValue && typeof ratingValue.rating === 'string') {
        rating = ratingValue.rating;
      } else if ('name' in ratingValue && typeof ratingValue.name === 'string') {
        rating = ratingValue.name;
      }
    }

    return typeof organization === 'string' &&
      knownOrganizations.has(organization.trim().toUpperCase()) &&
      typeof rating === 'string' &&
      rating.trim().length > 0 &&
      !nonRatings.has(normalizedLabel(rating));
  });

  return hasUsableRating ? 'rated' : 'unrated';
}

function decision(
  game: IgdbGame,
  eligible: boolean,
  reason: IgdbCatalogPolicyReason,
): IgdbCatalogPolicyDecision {
  return {
    eligible,
    policyVersion: IGDB_CATALOG_POLICY_VERSION,
    reason,
    ratingStatus: ratingStatus(game),
  };
}

function hasEroticTheme(game: IgdbGame) {
  return game.themes?.some((theme) =>
    typeof theme === 'number'
      ? theme === IGDB_EROTIC_THEME_ID
      : theme?.id === IGDB_EROTIC_THEME_ID
  ) ?? false;
}

/**
 * The one post-fetch eligibility gate for public IGDB catalog surfaces.
 *
 * Provider queries should apply the same filters to avoid spending capacity on
 * excluded records, but every result is evaluated here before normalization,
 * persistence, caching, or a public response. Mature/18 age ratings are not an
 * exclusion signal; IGDB's explicit erotic theme is evaluated separately.
 */
export function evaluateIgdbCatalogEligibility(
  game: IgdbGame,
): IgdbCatalogPolicyDecision {
  if (!Number.isSafeInteger(game.id) || game.id <= 0) {
    return decision(game, false, 'invalid_identity');
  }

  if (hasEroticTheme(game)) {
    return decision(game, false, 'erotic_theme');
  }

  if (game.version_parent !== null && game.version_parent !== undefined) {
    return decision(game, false, 'edition_variant');
  }

  if (typeof game.game_type === 'number' || !game.game_type?.type) {
    return decision(game, false, 'unknown_game_type');
  }

  const gameType = normalizedLabel(game.game_type.type);
  if (!(IGDB_INCLUDED_GAME_TYPES as readonly string[]).includes(gameType)) {
    return decision(game, false, 'excluded_game_type');
  }

  if (typeof game.game_status === 'number') {
    return decision(game, false, 'unknown_game_status');
  }

  if (game.game_status !== null && game.game_status !== undefined) {
    if (!game.game_status.status) {
      return decision(game, false, 'unknown_game_status');
    }

    const gameStatus = normalizedLabel(game.game_status.status);
    if ((IGDB_EXCLUDED_GAME_STATUSES as readonly string[]).includes(gameStatus)) {
      return decision(game, false, 'excluded_game_status');
    }
    if (!(IGDB_INCLUDED_GAME_STATUSES as readonly string[]).includes(gameStatus)) {
      return decision(game, false, 'unknown_game_status');
    }
  }

  return decision(game, true, 'eligible');
}

export function isCurrentIgdbCatalogPolicyVersion(value: unknown) {
  return value === IGDB_CATALOG_POLICY_VERSION;
}
