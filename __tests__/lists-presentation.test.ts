import {
  collectionMediaCounts,
  hasDuplicateListName,
  recentCollections,
  visibleListItems,
} from '@/features/lists/model/listPresentation';
import type { UserListItem, UserListSummary } from '@/features/lists/types';

export function listItem(
  id: string,
  overrides: Partial<UserListItem['media']> = {},
): UserListItem {
  return {
    id,
    listId: 'list',
    mediaItemId: id,
    note: null,
    position: null,
    createdAt: '2026-09-27T10:00:00Z',
    media: {
      id,
      title: id,
      source: 'tmdb',
      sourceId: `movie:${id}`,
      mediaType: 'movie',
      year: null,
      imageUrl: null,
      backdropUrl: null,
      releaseDate: null,
      originalTitle: null,
      genres: [],
      metadata: {},
      ...overrides,
    },
  };
}

describe('collection presentation', () => {
  it('defaults to real Date added descending, ignoring manual positions and using stable ties', () => {
    const older = {
      ...listItem('z'),
      createdAt: '2026-09-26T10:00:00Z',
      position: 0,
    };
    const items = [older, listItem('b'), { ...listItem('a'), position: 100 }];
    expect(visibleListItems(items, 'all', 'added').map((x) => x.id)).toEqual([
      'a',
      'b',
      'z',
    ]);
    expect(items[0]).toBe(older);
    expect(
      visibleListItems(
        [
          { ...listItem('z'), createdAt: '2026-09-27T12:00:00+02:00' },
          listItem('a'),
        ],
        'all',
        'added',
      ).map((x) => x.id),
    ).toEqual(['a', 'z']);
  });
  it('sorts title case-insensitively and release year newest first, unknown last, with stable ties', () => {
    const items = [
      listItem('d', { title: 'Zulu', year: null }),
      listItem('c', { title: 'alpha', year: '2025' }),
      listItem('b', { title: 'Alpha', year: '2025' }),
      listItem('a', { title: 'Beta', year: '2000' }),
    ];
    expect(visibleListItems(items, 'all', 'title').map((x) => x.id)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
    expect(visibleListItems(items, 'all', 'year').map((x) => x.id)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });
  it('counts all media, filters without changing membership, and permits empty matches', () => {
    const items = [
      listItem('a'),
      listItem('b', { mediaType: 'anime' }),
      listItem('c', { mediaType: 'game', source: 'igdb' }),
    ];
    expect(collectionMediaCounts(items)).toEqual({
      movie: 1,
      anime: 1,
      game: 1,
      series: 0,
    });
    expect(visibleListItems(items, 'anime', 'added').map((x) => x.id)).toEqual([
      'b',
    ]);
    expect(visibleListItems(items, 'series', 'added')).toEqual([]);
    expect(items).toHaveLength(3);
  });
  it('rejects trimmed/case-equivalent duplicate names while allowing the edited list itself', () => {
    const lists = [{ id: 'a', name: 'After hours' }];
    expect(hasDuplicateListName(lists, ' AFTER HOURS ')).toBe(true);
    expect(hasDuplicateListName(lists, 'After hours', 'a')).toBe(false);
  });
  it('features the most recently updated collection without mutating query order', () => {
    const lists = [
      { id: 'a', updatedAt: '2026-09-20T00:00:00Z' },
      { id: 'b', updatedAt: '2026-09-27T00:00:00Z' },
    ] as UserListSummary[];
    expect(recentCollections(lists).map((x) => x.id)).toEqual(['b', 'a']);
    expect(lists.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
