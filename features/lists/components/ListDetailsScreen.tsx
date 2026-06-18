import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DeleteListConfirmation } from '@/features/lists/components/DeleteListConfirmation';
import {
  getVisibleListFormErrors,
  ListForm,
  validateListForm,
  type ListFormTouchedFields,
  type ListFormValues,
} from '@/features/lists/components/ListForm';
import { ListItemCard } from '@/features/lists/components/ListItemCard';
import { useListDetails } from '@/features/lists/hooks/useListDetails';
import {
  useDeleteList,
  useRemoveListItem,
  useUpdateList,
  useUpdateListItemNote,
} from '@/features/lists/hooks/useListMutations';
import type { UserListDetails, UserListItem } from '@/features/lists/types';
import { createMediaRouteId } from '@/features/media/api/media-api';

type ListDetailsScreenProps = {
  listId?: string;
};

const EMPTY_LIST_FORM_VALUES: ListFormValues = {
  description: '',
  name: '',
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getMutationErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '23505'
  ) {
    return 'A list with this name already exists.';
  }

  return error instanceof Error ? error.message : 'Unable to save this list right now.';
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

function ListDetailsHeader({
  list,
  onEdit,
}: {
  list: UserListDetails;
  onEdit: () => void;
}) {
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
            onPress={onEdit}
            title="Edit List"
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
        Add titles from Search, Discover, or any Title Details screen.
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
        title="No titles yet"
        message="Titles saved to this list will appear here. Find something from Search or Discover, then save it from Title Details."
        actionLabel="Find Titles"
        onAction={() => router.push('/search')}
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
  const updateListMutation = useUpdateList();
  const deleteListMutation = useDeleteList();
  const removeListItemMutation = useRemoveListItem();
  const updateListItemNoteMutation = useUpdateListItemNote();
  const [isEditingList, setIsEditingList] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [formValues, setFormValues] = useState<ListFormValues>(
    EMPTY_LIST_FORM_VALUES,
  );
  const [touchedFields, setTouchedFields] = useState<ListFormTouchedFields>({});
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [savingNoteItemId, setSavingNoteItemId] = useState<string | null>(null);
  const [itemErrorId, setItemErrorId] = useState<string | null>(null);
  const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);
  const formErrors = useMemo(() => validateListForm(formValues), [formValues]);
  const visibleFormErrors = useMemo(
    () => getVisibleListFormErrors(formErrors, touchedFields, hasSubmittedForm),
    [formErrors, hasSubmittedForm, touchedFields],
  );
  const isSubmittingList = updateListMutation.isPending;
  const isDeletingList = deleteListMutation.isPending;

  useEffect(() => {
    if (listQuery.isSuccess && !listQuery.data) {
      router.replace('/lists');
    }
  }, [listQuery.data, listQuery.isSuccess]);

  const startEditList = useCallback((list: UserListDetails) => {
    setIsEditingList(true);
    setConfirmingDelete(false);
    setFormValues({
      description: list.description ?? '',
      name: list.name,
    });
    setTouchedFields({});
    setHasSubmittedForm(false);
    setSubmitError(null);
    setDeleteError(null);
  }, []);

  const cancelEditList = useCallback(() => {
    setIsEditingList(false);
    setConfirmingDelete(false);
    setFormValues(EMPTY_LIST_FORM_VALUES);
    setTouchedFields({});
    setHasSubmittedForm(false);
    setSubmitError(null);
    setDeleteError(null);
  }, []);

  const markFieldTouched = useCallback((key: keyof ListFormValues) => {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [key]: true,
    }));
  }, []);

  const updateFormValue = useCallback(
    <Key extends keyof ListFormValues>(key: Key, value: ListFormValues[Key]) => {
      setFormValues((currentValues) => ({
        ...currentValues,
        [key]: value,
      }));
      markFieldTouched(key);
      setSubmitError(null);
    },
    [markFieldTouched],
  );

  const submitListForm = useCallback(async () => {
    setHasSubmittedForm(true);

    if (!user || !listQuery.data || Object.keys(formErrors).length > 0) {
      return;
    }

    setSubmitError(null);

    try {
      await updateListMutation.mutateAsync({
        description: formValues.description,
        listId: listQuery.data.id,
        name: formValues.name,
        userId: user.id,
      });
      cancelEditList();
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    }
  }, [
    cancelEditList,
    formErrors,
    formValues.description,
    formValues.name,
    listQuery.data,
    updateListMutation,
    user,
  ]);

  const confirmDeleteList = useCallback(async () => {
    if (!user || !listQuery.data) {
      return;
    }

    setDeleteError(null);

    try {
      await deleteListMutation.mutateAsync({
        listId: listQuery.data.id,
        userId: user.id,
      });
      router.replace('/lists');
    } catch (error) {
      setDeleteError(getMutationErrorMessage(error));
    }
  }, [deleteListMutation, listQuery.data, user]);

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

  const currentList = listQuery.data;

  return (
    <Screen scroll className="gap-5">
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

      {!authLoading && user && currentList ? (
        <>
          <ListDetailsHeader
            list={currentList}
            onEdit={() => startEditList(currentList)}
          />

          {isEditingList ? (
            <ListForm
              deleteError={deleteError}
              errors={visibleFormErrors}
              hasSubmitted={hasSubmittedForm}
              isDeleting={isDeletingList}
              isSubmitting={isSubmittingList}
              list={currentList}
              submitError={submitError}
              touchedFields={touchedFields}
              values={formValues}
              onBlurField={markFieldTouched}
              onCancel={cancelEditList}
              onChange={updateFormValue}
              onDelete={() => {
                setConfirmingDelete(true);
                setDeleteError(null);
              }}
              onSubmit={submitListForm}
            />
          ) : null}

          {confirmingDelete ? (
            <DeleteListConfirmation
              error={deleteError}
              isDeleting={isDeletingList}
              list={currentList}
              onCancel={() => {
                setConfirmingDelete(false);
                setDeleteError(null);
              }}
              onConfirm={confirmDeleteList}
            />
          ) : null}

          <ListItemsSection
            itemErrorId={itemErrorId}
            itemErrorMessage={itemErrorMessage}
            list={currentList}
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
