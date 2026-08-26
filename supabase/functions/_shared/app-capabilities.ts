import { HttpError } from './cors.ts';
import {
  GAMES_FEATURE_DISABLED_CODE,
  resolveGamesFeatureEnabled,
  type ReadEnvironment,
} from './app-capability-values.ts';

export {
  GAMES_FEATURE_DISABLED_CODE,
  resolveGamesFeatureEnabled,
} from './app-capability-values.ts';

export type AppCapabilities = {
  gamesEnabled: boolean;
};

function readDenoEnvironment(name: string) {
  return Deno.env.get(name);
}

export function getAppCapabilities(
  readEnvironment: ReadEnvironment = readDenoEnvironment,
): AppCapabilities {
  return {
    gamesEnabled: resolveGamesFeatureEnabled(readEnvironment),
  };
}

export function requireGamesFeatureEnabled(
  readEnvironment: ReadEnvironment = readDenoEnvironment,
) {
  if (!resolveGamesFeatureEnabled(readEnvironment)) {
    throw new HttpError(
      503,
      'Games are temporarily unavailable.',
      GAMES_FEATURE_DISABLED_CODE,
    );
  }
}
