import { supabase } from '@/lib/supabase/client';
import type { PublicCatalogTitleResult } from '@/types/publicCatalogTitle';

export class PublicTitleUnavailableError extends Error {
  constructor() {
    super("This title isn't available in Revit yet.");
    this.name = 'PublicTitleUnavailableError';
  }
}

function responseStatus(error: unknown) {
  const context = (error as { context?: unknown } | null)?.context;
  return context instanceof Response ? context.status : undefined;
}

/** Calls the anonymous, database-only title resolver used for a shared URL. */
export async function getPublicTitle(
  titleId: string,
): Promise<PublicCatalogTitleResult> {
  const { data, error } = await supabase.functions.invoke<PublicCatalogTitleResult>(
    'public-title',
    { body: { titleId } },
  );

  if (error) {
    if (responseStatus(error) === 404) {
      throw new PublicTitleUnavailableError();
    }

    throw error;
  }

  if (!data?.item) {
    throw new Error('The shared title response was invalid.');
  }

  return data;
}
