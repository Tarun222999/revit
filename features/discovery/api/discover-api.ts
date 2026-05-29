import { supabase } from '@/lib/supabase/client';
import type {
  DiscoveryRailRequest,
  DiscoveryRailResponse,
} from '@/types/discovery';

export async function getDiscoverRail({
  mode,
  mediaType,
  page = 1,
}: DiscoveryRailRequest): Promise<DiscoveryRailResponse> {
  const { data, error } = await supabase.functions.invoke<DiscoveryRailResponse>(
    'media-discover',
    {
      body: {
        mode,
        mediaType,
        page,
      },
    },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No discovery results were returned.');
  }

  return data;
}
