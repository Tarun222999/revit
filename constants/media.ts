export const MEDIA_TYPES = ['movie', 'series', 'anime', 'game'] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movie',
  series: 'Series',
  anime: 'Anime',
  game: 'Game',
};
