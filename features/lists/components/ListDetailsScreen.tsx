import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ListItemCard } from '@/features/lists/components/ListItemCard';
import { useListDetails } from '@/features/lists/hooks/useListDetails';
import {
  useRemoveListItem,
  useUpdateListItemNote,
} from '@/features/lists/hooks/useListMutations';
import type { UserListDetails, UserListItem } from '@/features/lists/types';
import { createMediaRouteId } from '@/features/media/api/media-api';

type ListDetailsScreenProps = {
  listId?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getItemCountLabel(count: number) {
  return count === 1 ? '1 title' : `${count} titles`;
}

function openItemTitleDetails(item: UserListItem) {
  const routeId = createMediaRouteId({
    id: item.media.id,
    source: item.media.source,
    sourceId: item.media.sourceId,
  });

  router.push(`/title/${encodeURIComponent(routeId)}`);
}

function ListDetailsHeader({ list }: { list: UserListDetails }) {
  return (
    <Card className="gap-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-2">
          <Text className="text-3xl font-bold text-archive-50" numberOfLines={2}>
            {list.name}
          </Text>
          {list.description ? (
            <Text className="text-sm leading-5 text-archive-300">
              {list.description}
            </Text>
          ) : (
            <Text className="text-sm leading-5 text-archive-300">
              Mixed-media collection
            </Text>
          )}
        </View>
        <View className="rounded-full bg-archive-700 px-3 py-1">
          <Text className="text-xs font-bold text-gold-300">
            {getItemCountLabel(list.itemCount)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="min-w-0 flex-1">
          <Button
            onPress={() => router.push('/lists')}
            title="Manage List"
            variant="secondary"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Button
            onPress={() => router.push('/search')}
            title="Add Items"
          />
        </View>
      </View>
      <Text className="text-xs leading-4 text-archive-300">
        Open a title from Search or Discover, then use Add to List from Title Details.
      </Text>
    </Card>
  );
}

function ListItemsSection({
  itemErrorId,
  itemErrorMessage,
  list,
  removingItemId,
  savingNoteItemId,
  onRemoveItem,
  onSaveNote,
}: {
  itemErrorId: string | null;
  itemErrorMessage: string | null;
  list: UserListDetails;
  removingItemId: string | null;
  savingNoteItemId: string | null;
  onRemoveItem: (item: UserListItem) => void;
  onSaveNote: (item: UserListItem, note: string | null) => void;
}) {
  if (list.items.length === 0) {
    return (
      <EmptyState
        title="This list is empty"
        message="Add titles from Title Details to start shaping this collection."
      />
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-lg font-bold text-archive-50">List items</Text>
        <Text className="text-sm font-semibold text-archive-300">
          {getItemCountLabel(list.itemCount)}
        </Text>
      </View>

      {list.items.map((item) => (
        <ListItemCard
          isRemoving={removingItemId === item.id}
          isSavingNote={savingNoteItemId === item.id}
          item={item}
          key={item.id}
          mutationError={itemErrorId === item.id ? itemErrorMessage : null}
          onPress={() => openItemTitleDetails(item)}
          onRemove={() => onRemoveItem(item)}
          onSaveNote={(note) => onSaveNote(item, note)}
        />
      ))}
    </View>
  );
}

export function ListDetailsScreen({ listId }: ListDetailsScreenProps) {
  const { loading: authLoading, user } = useAuth();
  const listQuery = useListDetails(user?.id, listId);
  const removeListItemMutation = useRemoveListItem();
  const updateListItemNoteMutation = useUpdateListItemNote();
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [savingNoteItemId, setSavingNoteItemId] = useState<string | null>(null);
  const [itemErrorId, setItemErrorId] = useState<string | null>(null);
  const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (listQuery.isSuccess && !listQuery.data) {
      router.replace('/lists');
    }
  }, [listQuery.data, listQuery.isSuccess]);

  const removeItem = useCallback(
    async (item: UserListItem) => {
      if (!user) {
        return;
      }

      setRemovingItemId(item.id);
      setItemErrorId(null);
      setItemErrorMessage(null);

      try {
        await removeListItemMutation.mutateAsync({
          listItemId: item.id,
          mediaItemId: item.mediaItemId,
          userId: user.id,
        });
      } catch (error) {
        setItemErrorId(item.id);
        setItemErrorMessage(
          getErrorMessage(error, 'Unable to remove this title right now.'),
        );
      } finally {
        setRemovingItemId(null);
      }
    },
    [removeListItemMutation, user],
  );

  const saveNote = useCallback(
    async (item: UserListItem, note: string | null) => {
      if (!user) {
        return;
      }

      setSavingNoteItemId(item.id);
      setItemErrorId(null);
      setItemErrorMessage(null);

      try {
        await updateListItemNoteMutation.mutateAsync({
          listItemId: item.id,
          note,
          userId: user.id,
        });
      } catch (error) {
        setItemErrorId(item.id);
        setItemErrorMessage(
          getErrorMessage(error, 'Unable to save this note right now.'),
        );
      } finally {
        setSavingNoteItemId(null);
      }
    },
    [updateListItemNoteMutation, user],
  );

  return (
    <Screen scroll className="gap-5">
      <View className="flex-row items-center justify-between gap-4">
        <Button
          className="min-h-10 px-4"
          onPress={() => router.back()}
          title="Back"
          variant="secondary"
        />
      </View>

      {authLoading ? <LoadingState message="Loading list" /> : null}

      {!authLoading && !user ? (
        <EmptyState
          title="Sign in to view this list"
          message="Your custom collections are available after you sign in."
        />
      ) : null}

      {!authLoading && user && listQuery.isLoading ? (
        <LoadingState message="Loading list" />
      ) : null}

      {!authLoading && user && listQuery.isError ? (
        <ErrorState
          title="List unavailable"
          message={getErrorMessage(
            listQuery.error,
            'Unable to load this list right now.',
          )}
          retryLabel="Reload list"
          onRetry={() => listQuery.refetch()}
        />
      ) : null}

      {!authLoading && user && listQuery.data ? (
        <>
          <ListDetailsHeader list={listQuery.data} />
          <ListItemsSection
            itemErrorId={itemErrorId}
            itemErrorMessage={itemErrorMessage}
            list={listQuery.data}
            removingItemId={removingItemId}
            savingNoteItemId={savingNoteItemId}
            onRemoveItem={removeItem}
            onSaveNote={saveNote}
          />
        </>
      ) : null}
    </Screen>
  );
}
