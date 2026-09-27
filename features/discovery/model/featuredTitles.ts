import {
  dedupeMediaItems,
  mediaItemKey,
} from '@/features/discovery/utils/dedupeMediaItems';
import type { NormalizedMediaItem } from '@/types/media';

type FeatureRail = {
  data?: { results: NormalizedMediaItem[] };
  isPlaceholderData: boolean;
  isSuccess: boolean;
  isError: boolean;
};

const firstValidTitle = (rail: FeatureRail) =>
  (rail.data?.results ?? []).find((item) =>
    Boolean(item.source && item.sourceId && item.title.trim()),
  );

/** Undefined means initial data is still resolving; null means settled empty. */
export function getFeaturedTitle(
  rails: FeatureRail[],
): NormalizedMediaItem | null | undefined {
  for (const rail of rails) {
    if (rail.isPlaceholderData) return undefined;
    const item = firstValidTitle(rail);
    if (item) return item;
    if (!rail.isSuccess && !rail.isError) return undefined;
  }
  return null;
}

/** Use loaded results immediately, without waiting on unrelated media requests. */
export function getFeaturedTitles(
  rails: FeatureRail[],
): NormalizedMediaItem[] | undefined {
  const titles = dedupeMediaItems(
    rails.flatMap((rail) => {
      if (rail.isPlaceholderData) return [];
      const item = firstValidTitle(rail);
      return item ? [item] : [];
    }),
  );
  if (titles.length) return titles;
  return rails.some(
    (rail) => rail.isPlaceholderData || (!rail.isSuccess && !rail.isError),
  )
    ? undefined
    : [];
}

export function nextFeaturedKey(
  items: NormalizedMediaItem[],
  currentKey: string | null,
) {
  const current = items.findIndex((item) => mediaItemKey(item) === currentKey);
  return items.length
    ? mediaItemKey(items[(current + 1) % items.length])
    : null;
}
