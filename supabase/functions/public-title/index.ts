import { createServiceClient } from '../_shared/auth.ts';
import { createPublicTitleHandler, type PublicTitleIdentity } from '../_shared/public-title-handler.ts';
import { createPublicTitleRequestThrottle } from '../_shared/public-title-throttle.ts';
import {
  toPublicCatalogTitle,
  type MediaItemPublicRow,
} from '../_shared/public-title-mapper.ts';

async function loadTitle(identity: PublicTitleIdentity) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('media_items')
    .select('source, source_id, media_type, title, original_title, description, release_date, image_url, backdrop_url, genres, metadata')
    .eq('source', identity.source)
    .eq('source_id', identity.sourceId)
    .maybeSingle();

  if (error) {
    // Do not log request headers or response payloads on this public endpoint.
    throw new Error('Public title lookup failed.');
  }

  return data ? toPublicCatalogTitle(data as MediaItemPublicRow, identity) : null;
}

const handler = createPublicTitleHandler({
  allowRequest: createPublicTitleRequestThrottle(),
  loadTitle,
});

Deno.serve(handler);
