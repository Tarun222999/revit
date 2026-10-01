import type { SearchMediaType } from '@/features/discovery/api/search-api';
import { createMediaRouteId } from '@/features/media/api/media-api';
import type { NormalizedMediaItem } from '@/types/media';

const BASE_SEARCH_MEDIA_FILTERS: Array<{
  label: string;
  value: Exclude<SearchMediaType, 'game'>;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Movies', value: 'movie' },
  { label: 'Series', value: 'series' },
  { label: 'Anime', value: 'anime' },
];

/** Games is intentionally last and absent whenever the capability fails closed. */
export function getSearchMediaFilters(gamesEnabled: boolean) {
  return gamesEnabled
    ? [...BASE_SEARCH_MEDIA_FILTERS, { label: 'Games', value: 'game' as const }]
    : BASE_SEARCH_MEDIA_FILTERS;
}

export function getSearchPlaceholder(gamesEnabled: boolean) {
  return gamesEnabled
    ? 'Search movies, series, anime, or games'
    : 'Search movies, series, or anime';
}

/** The same provider-aware title route is used by every result source. */
export function getSearchResultRoute(item: NormalizedMediaItem) {
  return createMediaRouteId(item);
}
