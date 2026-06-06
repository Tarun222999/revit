export const MEDIA_TYPES = ['movie', 'series', 'anime', 'game'] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movie',
  series: 'Series',
  anime: 'Anime',
  game: 'Game',
};

export function isMediaType(value: string): value is MediaType {
  return MEDIA_TYPES.includes(value as MediaType);
}
