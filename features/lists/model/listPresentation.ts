import type { MediaType } from '@/constants/media';
import type { UserListItem, UserListSummary } from '@/features/lists/types';

export type ListMediaFilter = 'all' | MediaType;
export type ListSort = 'added' | 'title' | 'year';
export const LIST_SORT_LABELS: Record<ListSort, string> = {
  added: 'Date added',
  title: 'Title A–Z',
  year: 'Release year',
};

function timestamp(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export function visibleListItems(
  items: UserListItem[],
  filter: ListMediaFilter,
  sort: ListSort,
) {
  return items
    .filter((item) => filter === 'all' || item.media.mediaType === filter)
    .sort((a, b) => {
      const stable = a.id.localeCompare(b.id);
      if (sort === 'title')
        return (
          a.media.title.localeCompare(b.media.title, 'en', {
            sensitivity: 'base',
          }) || stable
        );
      if (sort === 'year')
        return Number(b.media.year ?? 0) - Number(a.media.year ?? 0) || stable;
      return timestamp(b.createdAt) - timestamp(a.createdAt) || stable;
    });
}

export function collectionMediaCounts(items: UserListItem[]) {
  return items.reduce<Record<MediaType, number>>(
    (counts, item) => {
      counts[item.media.mediaType] += 1;
      return counts;
    },
    { movie: 0, series: 0, anime: 0, game: 0 },
  );
}

export function recentCollections(lists: UserListSummary[]) {
  return [...lists].sort(
    (a, b) =>
      timestamp(b.updatedAt) - timestamp(a.updatedAt) ||
      a.id.localeCompare(b.id),
  );
}

export function hasDuplicateListName(
  lists: Pick<UserListSummary, 'id' | 'name'>[],
  name: string,
  exceptId?: string,
) {
  return lists.some(
    (list) =>
      list.id !== exceptId &&
      list.name.trim().toLocaleLowerCase('en') ===
        name.trim().toLocaleLowerCase('en'),
  );
}
