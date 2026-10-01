import {
  evaluateIgdbCatalogEligibility,
  IGDB_CATALOG_POLICY_VERSION,
  isCurrentIgdbCatalogPolicyVersion,
} from '../supabase/functions/_shared/igdb-catalog-policy';
import type { IgdbGame } from '../supabase/functions/_shared/igdb-types';

function game(overrides: Partial<IgdbGame> = {}): IgdbGame {
  return {
    id: 1,
    name: 'Eligible game',
    game_type: { id: 1, type: 'Main Game' },
    game_status: { id: 1, status: 'Released' },
    ...overrides,
  };
}

describe('IGDB catalog policy', () => {
  it.each(['Main Game', 'main_game', 'Remake', 'Remaster'])(
    'allows the initial catalog type %s',
    (type) => {
      expect(evaluateIgdbCatalogEligibility(game({ game_type: { type } }))).toMatchObject({
        eligible: true,
        reason: 'eligible',
        policyVersion: IGDB_CATALOG_POLICY_VERSION,
      });
    },
  );

  it.each([
    'DLC Addon',
    'Expansion',
    'Bundle',
    'Standalone Expansion',
    'Mod',
    'Episode',
    'Season',
    'Expanded Game',
    'Port',
    'Fork',
    'Pack',
    'Update',
  ])('excludes the non-journal-title type %s', (type) => {
    expect(evaluateIgdbCatalogEligibility(game({ game_type: { type } }))).toMatchObject({
      eligible: false,
      reason: 'excluded_game_type',
    });
  });

  it('fails closed when the current game type relation was not expanded', () => {
    expect(evaluateIgdbCatalogEligibility(game({ game_type: 1 }))).toMatchObject({
      eligible: false,
      reason: 'unknown_game_type',
    });
  });

  it('excludes IGDB erotic theme 42 independently of age ratings', () => {
    expect(evaluateIgdbCatalogEligibility(game({
      themes: [{ id: 42, name: 'Erotic' }],
      age_ratings: [],
    }))).toMatchObject({ eligible: false, reason: 'erotic_theme' });
  });

  it('allows mature and 18-rated games because ratings are not adult-content evidence', () => {
    const matureGame = game({
      age_ratings: [
        { organization: { name: 'ESRB' }, rating_category: { rating: 'M' } },
        { organization: { name: 'PEGI' }, rating_category: { rating: '18' } },
      ],
    });

    expect(evaluateIgdbCatalogEligibility(matureGame)).toMatchObject({
      eligible: true,
      reason: 'eligible',
      ratingStatus: 'rated',
    });
  });

  it('allows missing and unknown ratings without a safety claim', () => {
    expect(evaluateIgdbCatalogEligibility(game({ age_ratings: undefined }))).toMatchObject({
      eligible: true,
      ratingStatus: 'unrated',
    });
    expect(evaluateIgdbCatalogEligibility(game({
      age_ratings: [{ organization: { name: 'Unknown' }, rating_category: { rating: 'Unknown' } }],
    }))).toMatchObject({ eligible: true, ratingStatus: 'unrated' });
    expect(evaluateIgdbCatalogEligibility(game({
      age_ratings: [{ organization: 1, rating_category: 2 }],
    }))).toMatchObject({ eligible: true, ratingStatus: 'unrated' });
    expect(evaluateIgdbCatalogEligibility(game({
      age_ratings: [{ organization: { name: 'ESRB' }, rating_category: { rating: 'Rating Pending' } }],
    }))).toMatchObject({ eligible: true, ratingStatus: 'unrated' });
  });

  it('retains conflicting usable regional ratings without using them as exclusions', () => {
    expect(evaluateIgdbCatalogEligibility(game({
      age_ratings: [
        { organization: { name: 'ESRB' }, rating_category: { rating: 'E' } },
        { organization: { name: 'PEGI' }, rating_category: { rating: '18' } },
      ],
    }))).toMatchObject({ eligible: true, ratingStatus: 'rated' });
  });

  it('excludes versioned editions while preserving base remakes and remasters', () => {
    expect(evaluateIgdbCatalogEligibility(game({ version_parent: 99 }))).toMatchObject({
      eligible: false,
      reason: 'edition_variant',
    });
  });

  it.each(['Cancelled', 'Rumored', 'Delisted'])(
    'excludes the public catalog status %s',
    (status) => {
      expect(evaluateIgdbCatalogEligibility(game({ game_status: { status } }))).toMatchObject({
        eligible: false,
        reason: 'excluded_game_status',
      });
    },
  );

  it.each(['Released', 'Alpha', 'Beta', 'Early Access', 'Offline'])(
    'allows the catalog status %s',
    (status) => {
      expect(evaluateIgdbCatalogEligibility(game({ game_status: { status } }))).toMatchObject({
        eligible: true,
        reason: 'eligible',
      });
    },
  );

  it('allows a missing status but fails closed on an unexpanded current status relation', () => {
    expect(evaluateIgdbCatalogEligibility(game({ game_status: undefined }))).toMatchObject({
      eligible: true,
      reason: 'eligible',
    });
    expect(evaluateIgdbCatalogEligibility(game({ game_status: 6 }))).toMatchObject({
      eligible: false,
      reason: 'unknown_game_status',
    });
  });

  it.each([
    { status: 'New Provider Status' },
    {},
  ])('fails closed on unknown or malformed expanded status %#', (gameStatus) => {
    expect(evaluateIgdbCatalogEligibility(game({ game_status: gameStatus }))).toMatchObject({
      eligible: false,
      reason: 'unknown_game_status',
    });
  });

  it('rejects invalid provider identities', () => {
    expect(evaluateIgdbCatalogEligibility(game({ id: 0 }))).toMatchObject({
      eligible: false,
      reason: 'invalid_identity',
    });
  });

  it('invalidates cache entries written under another policy version', () => {
    expect(isCurrentIgdbCatalogPolicyVersion(IGDB_CATALOG_POLICY_VERSION)).toBe(true);
    expect(isCurrentIgdbCatalogPolicyVersion('games-catalog-v0')).toBe(false);
    expect(isCurrentIgdbCatalogPolicyVersion(undefined)).toBe(false);
  });
});
