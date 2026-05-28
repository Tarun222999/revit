import type { MediaType } from '@/constants/media';

export type MediaSource = 'tmdb' | 'igdb';

export type MediaItem = {
  id: string;
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  releaseDate?: string | null;
  year?: string | null;
  imageUrl?: string | null;
  backdropUrl?: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
};

export type NormalizedMediaItem = Omit<MediaItem, 'id'> & {
  id?: string;
};
