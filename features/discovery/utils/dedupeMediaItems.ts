import type { NormalizedMediaItem } from '@/types/media';

export function dedupeMediaItems(items: NormalizedMediaItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.source}:${item.sourceId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
