/**
 * The deliberately limited catalog shape that may be returned to someone who
 * opens a shared title URL. It contains no Revit row identifier, ownership,
 * timestamps, or personal Journal/list data.
 */
export type PublicCatalogTitle = {
  source: 'tmdb' | 'igdb';
  sourceId: string;
  mediaType: 'movie' | 'series' | 'anime' | 'game';
  title: string;
  originalTitle: string | null;
  description: string | null;
  releaseDate: string | null;
  year: string | null;
  imageUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
};

export type PublicCatalogTitleResult = {
  item: PublicCatalogTitle;
};
