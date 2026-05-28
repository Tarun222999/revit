import type { NormalizedMediaItem } from '@/types/media';

export const DISCOVERY_MODES = [
  'trending',
  'new_releases',
  'top_rated',
] as const;

export const DISCOVERY_MEDIA_TYPES = ['movie', 'series', 'anime'] as const;

export type DiscoveryMode = (typeof DISCOVERY_MODES)[number];
export type DiscoveryMediaType = (typeof DISCOVERY_MEDIA_TYPES)[number];

export type DiscoveryRailRequest = {
  mode: DiscoveryMode;
  mediaType: DiscoveryMediaType;
  page?: number;
};

export type DiscoveryRailResponse = {
  results: NormalizedMediaItem[];
  page: number;
  totalPages: number;
  cachedAt?: string;
};

export function isDiscoveryMode(value: string): value is DiscoveryMode {
  return DISCOVERY_MODES.includes(value as DiscoveryMode);
}

export function isDiscoveryMediaType(value: string): value is DiscoveryMediaType {
  return DISCOVERY_MEDIA_TYPES.includes(value as DiscoveryMediaType);
}
