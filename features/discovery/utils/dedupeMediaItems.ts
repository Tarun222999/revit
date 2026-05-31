import type { NormalizedMediaItem } from '@/types/media';

export function mediaItemKey(item: Pick<NormalizedMediaItem, 'source' | 'sourceId'>) {
  return `${item.source}:${item.sourceId}`;
}

export function dedupeMediaItems(items: NormalizedMediaItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = mediaItemKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
