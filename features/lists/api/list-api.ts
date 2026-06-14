import {
  toUserListDetails,
  toUserListSummaries,
} from '@/features/lists/model/listModels';
import { supabase } from '@/lib/supabase/client';
import type {
  AddMediaItemToListInput,
  CreateListInput,
  DeleteListInput,
  ListInsert,
  ListItemInsert,
  ListItemUpdate,
  ListUpdate,
  MediaListMembership,
  RemoveListItemInput,
  UpdateListInput,
  UpdateListItemNoteInput,
  UserListDetailsRow,
  UserListSummaryRow,
} from '@/features/lists/types';

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim() ?? '';

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(value: string) {
  return value.trim();
}

export async function getUserLists(userId: string) {
  const { data, error } = await supabase
    .from('lists')
    .select(
      `
        *,
        list_items (
          id,
          media_item_id,
          position,
          created_at,
          media_items (
            id,
            source,
            source_id,
            media_type,
            title,
            original_title,
            description,
            release_date,
            image_url,
            backdrop_url,
            genres,
            metadata,
            created_at,
            updated_at
          )
        )
      `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return toUserListSummaries((data ?? []) as UserListSummaryRow[]);
}

export async function getListDetails({
  listId,
  userId,
}: {
  listId: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from('lists')
    .select(
      `
        *,
        list_items (
          id,
          list_id,
          media_item_id,
          position,
          note,
          created_at,
          media_items (
            id,
            source,
            source_id,
            media_type,
            title,
            original_title,
            description,
            release_date,
            image_url,
            backdrop_url,
            genres,
            metadata,
            created_at,
            updated_at
          )
        )
      `,
    )
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toUserListDetails(data as UserListDetailsRow) : null;
}

export async function getMediaListMemberships({
  mediaItemId,
  userId,
}: {
  mediaItemId: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from('list_items')
    .select(
      `
        id,
        list_id,
        media_item_id,
        note,
        created_at,
        lists!inner (
          id,
          user_id,
          name,
          description
        )
      `,
    )
    .eq('media_item_id', mediaItemId)
    .eq('lists.user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const list = Array.isArray(row.lists) ? row.lists[0] : row.lists;

    if (!list) {
      throw new Error(`List item ${row.id} is missing list metadata.`);
    }

    return {
      createdAt: row.created_at,
      listDescription: list.description,
      listId: row.list_id,
      listItemId: row.id,
      listName: list.name,
      mediaItemId: row.media_item_id,
      note: row.note,
    } satisfies MediaListMembership;
  });
}

export async function createList(input: CreateListInput) {
  const list: ListInsert = {
    description: normalizeOptionalText(input.description),
    name: normalizeRequiredText(input.name),
    user_id: input.userId,
  };

  const { data, error } = await supabase.from('lists').insert(list).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateList(input: UpdateListInput) {
  const list: ListUpdate = {
    description: normalizeOptionalText(input.description),
    name: normalizeRequiredText(input.name),
  };

  const { data, error } = await supabase
    .from('lists')
    .update(list)
    .eq('id', input.listId)
    .eq('user_id', input.userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteList(input: DeleteListInput) {
  const { data, error } = await supabase
    .from('lists')
    .delete()
    .eq('id', input.listId)
    .eq('user_id', input.userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function addMediaItemToList(input: AddMediaItemToListInput) {
  const listItem: ListItemInsert = {
    list_id: input.listId,
    media_item_id: input.mediaItemId,
  };

  const { data, error } = await supabase
    .from('list_items')
    .upsert(listItem, { onConflict: 'list_id,media_item_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removeListItem(input: RemoveListItemInput) {
  const { data, error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', input.listItemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateListItemNote(input: UpdateListItemNoteInput) {
  const listItem: ListItemUpdate = {
    note: normalizeOptionalText(input.note),
  };

  const { data, error } = await supabase
    .from('list_items')
    .update(listItem)
    .eq('id', input.listItemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
