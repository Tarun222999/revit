import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  addMediaItemToList,
  createList,
  deleteList,
  removeListItem,
  updateList,
  updateListItemNote,
} from '@/features/lists/api/list-api';
import { listDetailsQueryKey } from '@/features/lists/hooks/useListDetails';
import { mediaListMembershipsQueryKey } from '@/features/lists/hooks/useMediaListMemberships';
import { userListsQueryKey } from '@/features/lists/hooks/useUserLists';
import type {
  AddMediaItemToListInput,
  CreateListInput,
  DeleteListInput,
  RemoveListItemInput,
  UpdateListInput,
  UpdateListItemNoteInput,
} from '@/features/lists/types';

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateListInput) => createList(input),
    onSuccess: (list) => {
      queryClient.invalidateQueries({
        queryKey: userListsQueryKey(list.user_id),
      });
    },
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateListInput) => updateList(input),
    onSuccess: (list) => {
      queryClient.invalidateQueries({
        queryKey: userListsQueryKey(list.user_id),
      });
      queryClient.invalidateQueries({
        queryKey: listDetailsQueryKey(list.user_id, list.id),
      });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteListInput) => deleteList(input),
    onSuccess: (list) => {
      queryClient.invalidateQueries({
        queryKey: userListsQueryKey(list.user_id),
      });
      queryClient.removeQueries({
        queryKey: listDetailsQueryKey(list.user_id, list.id),
      });
    },
  });
}

export function useAddMediaItemToList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddMediaItemToListInput) => addMediaItemToList(input),
    onSuccess: (listItem, input) => {
      queryClient.invalidateQueries({
        queryKey: userListsQueryKey(input.userId),
      });
      queryClient.invalidateQueries({
        queryKey: listDetailsQueryKey(input.userId, listItem.list_id),
      });
      queryClient.invalidateQueries({
        queryKey: mediaListMembershipsQueryKey(input.userId, input.mediaItemId),
      });
    },
  });
}

export function useRemoveListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RemoveListItemInput) => removeListItem(input),
    onSuccess: (listItem, input) => {
      queryClient.invalidateQueries({
        queryKey: userListsQueryKey(input.userId),
      });
      queryClient.invalidateQueries({
        queryKey: listDetailsQueryKey(input.userId, listItem.list_id),
      });

      const mediaItemId = input.mediaItemId ?? listItem.media_item_id;

      queryClient.invalidateQueries({
        queryKey: mediaListMembershipsQueryKey(input.userId, mediaItemId),
      });
    },
  });
}

export function useUpdateListItemNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateListItemNoteInput) => updateListItemNote(input),
    onSuccess: (listItem, input) => {
      queryClient.invalidateQueries({
        queryKey: userListsQueryKey(input.userId),
      });
      queryClient.invalidateQueries({
        queryKey: listDetailsQueryKey(input.userId, listItem.list_id),
      });
      queryClient.invalidateQueries({
        queryKey: mediaListMembershipsQueryKey(input.userId, listItem.media_item_id),
      });
    },
  });
}
