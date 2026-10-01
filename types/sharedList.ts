/** Public catalog projection only; never reuse private UserListItem models. */
export type SharedListTitle = {
  source: 'tmdb' | 'igdb';
  sourceId: string;
  mediaType: 'movie' | 'series' | 'anime' | 'game';
  title: string;
  year: string | null;
  imageUrl: string | null;
};

export type SharedListPage = {
  name: string;
  description: string | null;
  itemCount: number;
  coverItems: SharedListTitle[];
  items: SharedListTitle[];
  nextCursor: string | null;
} & ({ isOwner: false; listId?: never } | { isOwner: true; listId: string });

export type ListSharingState = {
  version: number;
  shareKey: string | null;
};

export type ManageListSharingInput = {
  listId: string;
  action: 'state' | 'share' | 'stop';
  expectedVersion?: number;
};
