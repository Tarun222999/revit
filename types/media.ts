import type { MediaType } from '@/constants/media';

export type MediaItem = {
  id: string;
  source: 'tmdb' | 'igdb';
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  releaseDate?: string | null;
  imageUrl?: string | null;
  backdropUrl?: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
};
