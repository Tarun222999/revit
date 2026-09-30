import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CollectionSheet } from '@/features/lists/components/CollectionSheet';
import { CollectionContents } from '@/features/lists/components/CollectionContents';
import { ListDetailsHeader } from '@/features/lists/components/ListDetailsHeader';
import { DeleteListConfirmation } from '@/features/lists/components/DeleteListConfirmation';
import {
  getVisibleListFormErrors,
  ListForm,
  validateListForm,
  type ListFormTouchedFields,
  type ListFormValues,
} from '@/features/lists/components/ListForm';
import { useCollectionDismiss } from '@/features/lists/hooks/useCollectionDismiss';
import { useUserLists } from '@/features/lists/hooks/useUserLists';
import { useListDetails } from '@/features/lists/hooks/useListDetails';
import {
  useDeleteList,
  useRemoveListItem,
  useUpdateList,
  useUpdateListItemNote,
} from '@/features/lists/hooks/useListMutations';
import { hasDuplicateListName } from '@/features/lists/model/listPresentation';
import type { UserListDetails, UserListItem } from '@/features/lists/types';
import { createMediaRouteId } from '@/features/media/api/media-api';

const EMPTY_VALUES: ListFormValues = { name: '', description: '' };
function errorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '23505'
  )
    return 'A list with this name already exists.';
  return error instanceof Error ? error.message : fallback;
}
function openTitle(item: UserListItem) {
  router.push(
    `/title/${encodeURIComponent(createMediaRouteId({ id: item.media.id, source: item.media.source, sourceId: item.media.sourceId }))}`,
  );
}

export function ListDetailsScreen({ listId }: { listId?: string }) {
  const { loading: authLoading, user } = useAuth();
  const listQuery = useListDetails(user?.id, listId);
  const listsQuery = useUserLists(user?.id);
  const update = useUpdateList();
  const deletion = useDeleteList();
  const remove = useRemoveListItem();
  const noteMutation = useUpdateListItemNote();
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [values, setValues] = useState<ListFormValues>(EMPTY_VALUES);
  const [initialValues, setInitialValues] =
    useState<ListFormValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<ListFormTouchedFields>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [itemErrorId, setItemErrorId] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const submitting = useRef(false);
  const deleting = useRef(false);
  const itemRequests = useRef(new Set<string>());
  const errors = useMemo(() => validateListForm(values), [values]);
  const visibleErrors = getVisibleListFormErrors(errors, touched, submitted);
  const list = listQuery.data;
  useEffect(() => {
    if (listQuery.isSuccess && !listQuery.data) router.replace('/lists');
  }, [listQuery.isSuccess, listQuery.data]);
  const closeEdit = useCallback(() => {
    setEditing(false);
    setSubmitError(null);
  }, []);
  const dismissEdit = useCollectionDismiss(
    editing,
    values.name !== initialValues.name ||
      values.description !== initialValues.description,
    update.isPending || submitting.current,
    closeEdit,
  );
  const startEdit = (current: UserListDetails) => {
    const next = { name: current.name, description: current.description ?? '' };
    setValues(next);
    setInitialValues(next);
    setTouched({});
    setSubmitted(false);
    setSubmitError(null);
    setOptions(false);
    setEditing(true);
  };
  const submit = async () => {
    setSubmitted(true);
    if (!user || !list || submitting.current || Object.keys(errors).length)
      return;
    if (hasDuplicateListName(listsQuery.data ?? [], values.name, list.id)) {
      setSubmitError('A list with this name already exists.');
      return;
    }
    submitting.current = true;
    setSubmitError(null);
    try {
      await update.mutateAsync({ userId: user.id, listId: list.id, ...values });
      closeEdit();
    } catch (error) {
      setSubmitError(
        errorMessage(error, 'Unable to save this list. Try again.'),
      );
    } finally {
      submitting.current = false;
    }
  };
  const deleteList = async () => {
    if (!user || !list || deleting.current) return;
    deleting.current = true;
    setDeleteError(null);
    try {
      await deletion.mutateAsync({ userId: user.id, listId: list.id });
      router.replace('/lists');
    } catch (error) {
      setDeleteError(
        errorMessage(error, 'Unable to delete this list. Try again.'),
      );
    } finally {
      deleting.current = false;
    }
  };
  const removeItem = async (item: UserListItem) => {
    if (!user || itemRequests.current.has(item.id)) return;
    itemRequests.current.add(item.id);
    setRemovingId(item.id);
    setItemErrorId(null);
    setItemError(null);
    try {
      await remove.mutateAsync({
        listItemId: item.id,
        mediaItemId: item.mediaItemId,
        userId: user.id,
      });
    } catch (error) {
      setItemErrorId(item.id);
      setItemError(
        errorMessage(error, 'Unable to remove this title. Try again.'),
      );
    } finally {
      itemRequests.current.delete(item.id);
      setRemovingId(null);
    }
  };
  const saveNote = async (item: UserListItem, note: string | null) => {
    if (!user || itemRequests.current.has(item.id))
      throw new Error('Unable to save this note right now.');
    itemRequests.current.add(item.id);
    setSavingId(item.id);
    setItemErrorId(null);
    setItemError(null);
    try {
      await noteMutation.mutateAsync({
        listItemId: item.id,
        note,
        userId: user.id,
      });
    } catch (error) {
      setItemErrorId(item.id);
      setItemError(errorMessage(error, 'Unable to save this note. Try again.'));
      throw error;
    } finally {
      itemRequests.current.delete(item.id);
      setSavingId(null);
    }
  };
  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          title: 'Collection',
          headerRight: () =>
            list && user ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Collection options"
                accessibilityState={{ expanded: options }}
                className="h-12 w-12 items-center justify-center"
                onPress={() => setOptions(true)}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={22}
                  color="#fbf6ec"
                />
              </Pressable>
            ) : null,
        }}
      />
      {authLoading || (user && listQuery.isLoading) ? (
        <LoadingState message="Loading list" />
      ) : null}
      {!authLoading && !user ? (
        <EmptyState
          title="Sign in to view this list"
          message="Your custom collections are available after you sign in."
        />
      ) : null}
      {!authLoading && user && listQuery.isError ? (
        <ErrorState
          title="List unavailable"
          message={errorMessage(
            listQuery.error,
            'Unable to load this list right now.',
          )}
          retryLabel="Reload list"
          onRetry={() => listQuery.refetch()}
        />
      ) : null}
      {!authLoading && user && list ? (
        <>
          <CollectionContents
            header={
              <ListDetailsHeader list={list} onEdit={() => startEdit(list)} />
            }
            list={list}
            itemErrorId={itemErrorId}
            itemErrorMessage={itemError}
            removingItemId={removingId}
            savingNoteItemId={savingId}
            onPressItem={openTitle}
            onRemoveItem={removeItem}
            onSaveNote={saveNote}
          />
          {options ? (
            <CollectionSheet
              title="Collection options"
              onClose={() => setOptions(false)}
            >
              <Button
                title="Edit name & description"
                variant="secondary"
                onPress={() => startEdit(list)}
              />
              <Button
                title="Delete list"
                variant="danger"
                onPress={() => {
                  setOptions(false);
                  setDeleteError(null);
                  setConfirmingDelete(true);
                }}
              />
            </CollectionSheet>
          ) : null}
          {editing ? (
            <CollectionSheet
              title="Edit list"
              onClose={dismissEdit}
              busy={update.isPending}
            >
              <ListForm
                errors={visibleErrors}
                hasSubmitted={submitted}
                isSubmitting={update.isPending}
                list={list}
                submitError={submitError}
                touchedFields={touched}
                values={values}
                onBlurField={(key) =>
                  setTouched((current) => ({ ...current, [key]: true }))
                }
                onCancel={dismissEdit}
                onChange={(key, value) => {
                  setValues((current) => ({ ...current, [key]: value }));
                  setTouched((current) => ({ ...current, [key]: true }));
                  setSubmitError(null);
                }}
                onSubmit={submit}
                showIntro={false}
                showDeleteAction={false}
              />
            </CollectionSheet>
          ) : null}
          {confirmingDelete ? (
            <DeleteListConfirmation
              error={deleteError}
              isDeleting={deletion.isPending}
              list={list}
              onCancel={() => {
                if (!deleting.current) setConfirmingDelete(false);
              }}
              onConfirm={deleteList}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
