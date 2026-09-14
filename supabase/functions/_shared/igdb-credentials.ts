import { IgdbProviderError } from './provider-errors.ts';

export type IgdbCredentials = {
  clientId: string;
  clientSecret: string;
};

type ReadEnvironment = (name: string) => string | undefined;

function readDenoEnvironment(name: string) {
  return Deno.env.get(name);
}

export function getIgdbCredentials(
  readEnvironment: ReadEnvironment = readDenoEnvironment,
): IgdbCredentials {
  try {
    const clientId = readEnvironment('IGDB_CLIENT_ID')?.trim();
    const clientSecret = readEnvironment('IGDB_CLIENT_SECRET')?.trim();

    if (!clientId || !clientSecret || clientId.length > 512 || clientSecret.length > 2048) {
      throw new IgdbProviderError('igdb_not_configured');
    }

    return { clientId, clientSecret };
  } catch (error) {
    if (error instanceof IgdbProviderError) {
      throw error;
    }

    throw new IgdbProviderError('igdb_not_configured');
  }
}
