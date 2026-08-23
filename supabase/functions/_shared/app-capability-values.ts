export type ReadEnvironment = (name: string) => string | undefined;

export const GAMES_FEATURE_DISABLED_CODE = 'games_feature_disabled';

export function resolveGamesFeatureEnabled(readEnvironment: ReadEnvironment) {
  try {
    return readEnvironment('GAMES_FEATURE_ENABLED') === 'true';
  } catch {
    return false;
  }
}
