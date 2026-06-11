import type { MediaType } from '@/constants/media';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/types';
import type { MediaSource } from '@/types/media';

export type ListRow = Tables<'lists'>;
export type ListInsert = TablesInsert<'lists'>;
export type ListUpdate = TablesUpdate<'lists'>;
export type ListItemRow = Tables<'list_items'>;
export type ListItemInsert = TablesInsert<'list_items'>;
export type ListItemUpdate = TablesUpdate<'list_items'>;
export type MediaItemRow = Tables<'media_items'>;

export type ListCoverMedia = {
  mediaItemId: string;
  title: string;
  mediaType: MediaType;
  imageUrl: string | null;
};

export type UserListSummary = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  itemCount: number;
  coverItems: ListCoverMedia[];
  createdAt: string;
  updatedAt: string;
};

export type ListItemMedia = {
  id: string;
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  releaseDate: string | null;
  year: string | null;
  imageUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
};

export type UserListItem = {
  id: string;
  listId: string;
  mediaItemId: string;
  position: number | null;
  note: string | null;
  createdAt: string;
  media: ListItemMedia;
};

export type UserListDetails = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  itemCount: number;
  items: UserListItem[];
  createdAt: string;
  updatedAt: string;
};

export type MediaListMembership = {
  listItemId: string;
  listId: string;
  mediaItemId: string;
  listName: string;
  listDescription: string | null;
  note: string | null;
  createdAt: string;
};

export type UserListSummaryItemRow = Pick<
  ListItemRow,
  'id' | 'created_at' | 'media_item_id' | 'position'
> & {
  media_items: MediaItemRow | null;
};

export type UserListSummaryRow = ListRow & {
  list_items: UserListSummaryItemRow[] | null;
};

export type UserListItemRow = ListItemRow & {
  media_items: MediaItemRow | null;
};

export type UserListDetailsRow = ListRow & {
  list_items: UserListItemRow[] | null;
};

export type CreateListInput = {
  userId: string;
  name: string;
  description?: string | null;
};

export type UpdateListInput = {
  listId: string;
  userId: string;
  name: string;
  description?: string | null;
};

export type DeleteListInput = {
  listId: string;
  userId: string;
};

export type AddMediaItemToListInput = {
  listId: string;
  mediaItemId: string;
  userId: string;
};

export type RemoveListItemInput = {
  listItemId: string;
  mediaItemId?: string;
  userId: string;
};

export type UpdateListItemNoteInput = {
  listItemId: string;
  userId: string;
  note: string | null;
};
