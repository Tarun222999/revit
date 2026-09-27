import { useEffect, useRef, useState } from 'react';
import { mediaItemKey } from '@/features/discovery/utils/dedupeMediaItems';
import { nextFeaturedKey } from '@/features/discovery/model/featuredTitles';
import type { NormalizedMediaItem } from '@/types/media';

export const FEATURE_INTERVAL_MS = 6500;

export function useFeaturedRotation(
  items: NormalizedMediaItem[] | undefined,
  enabled: boolean,
) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const previous = useRef<NormalizedMediaItem | null>(null);
  const item =
    items === undefined
      ? previous.current
      : (items.find((candidate) => mediaItemKey(candidate) === selectedKey) ??
        items[0] ??
        null);
  const key = item ? mediaItemKey(item) : null;
  const program = items?.map(mediaItemKey).join('|');
  useEffect(() => {
    previous.current = item;
  }, [item]);
  useEffect(() => {
    if (!enabled || !items || items.length < 2) return;
    const timer = setTimeout(
      () => setSelectedKey(nextFeaturedKey(items, key)),
      FEATURE_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
    // Identity changes restart the interval; metadata refreshes do not postpone rotation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, program]);
  return item;
}
