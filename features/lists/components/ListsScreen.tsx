import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DeleteListConfirmation } from '@/features/lists/components/DeleteListConfirmation';
import { ListCard } from '@/features/lists/components/ListCard';
import {
  ListForm,
  validateListForm,
  type ListFormValues,
} from '@/features/lists/components/ListForm';
import {
  useCreateList,
  useDeleteList,
  useUpdateList,
} from '@/features/lists/hooks/useListMutations';
import { useUserLists } from '@/features/lists/hooks/useUserLists';
import type { UserListSummary } from '@/features/lists/types';

const LISTS_LOADING_PLACEHOLDER_COUNT = 3;
const EMPTY_LIST_FORM_VALUES: ListFormValues = {
  description: '',
  name: '',
};

type ListFormMode = 'create' | 'edit' | null;

function getListsErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load your lists right now.';
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

function getListStats(lists: UserListSummary[]) {
  const itemCount = lists.reduce((total, list) => total + list.itemCount, 0);
  const activeLists = lists.filter((list) => list.itemCount > 0).length;

  return {
    activeLists,
    itemCount,
    listCount: lists.length,
  };
}

function getTitleCountLabel(count: number) {
  return count === 1 ? '1 title' : `${count} titles`;
}

function ListsLoadingState() {
  return (
    <View className="gap-4">
      <LoadingState message="Loading lists" />

      {Array.from({ length: LISTS_LOADING_PLACEHOLDER_COUNT }).map(
        (_, placeholderIndex) => (
          <Card className="gap-3 p-3" key={placeholderIndex}>
            <View className="flex-row gap-3">
              <View className="h-24 w-24 rounded-app bg-shelf-700" />
              <View className="min-w-0 flex-1 gap-3">
                <View className="h-5 w-3/4 rounded-full bg-archive-700" />
                <View className="h-3 w-full rounded-full bg-archive-700" />
                <View className="h-3 w-2/3 rounded-full bg-archive-700" />
                <View className="h-6 w-24 rounded-full bg-archive-700" />
              </View>
            </View>
          </Card>
        ),
      )}
    </View>
  );
}

function ListsStats({ lists }: { lists: UserListSummary[] }) {
  const stats = getListStats(lists);

  return (
    <View className="flex-row gap-3">
      <Card className="min-w-0 flex-1 gap-1 p-3">
        <Text className="text-xl font-bold text-archive-50">
          {stats.listCount}
        </Text>
        <Text className="text-xs font-semibold text-archive-300">
          Lists
        </Text>
      </Card>
      <Card className="min-w-0 flex-1 gap-1 p-3">
        <Text className="text-xl font-bold text-archive-50">
          {stats.itemCount}
        </Text>
        <Text className="text-xs font-semibold text-archive-300">
          Saved titles
        </Text>
      </Card>
      <Card className="min-w-0 flex-1 gap-1 p-3">
        <Text className="text-xl font-bold text-archive-50">
          {stats.activeLists}
        </Text>
        <Text className="text-xs font-semibold text-archive-300">
          Active
        </Text>
      </Card>
    </View>
  );
}

function ListsLoadedContent({
  lists,
  onCreateList,
  onEditList,
}: {
  lists: UserListSummary[];
  onCreateList: () => void;
  onEditList: (list: UserListSummary) => void;
}) {
  if (lists.length === 0) {
    return (
      <EmptyState
        title="Create your first list"
        message="Build mixed-media collections like Favorites, Watch Next, or Best Endings."
        actionLabel="Create List"
        onAction={onCreateList}
      />
    );
  }

  return (
    <>
      <ListsStats lists={lists} />

      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-lg font-bold text-archive-50">
            Your collections
          </Text>
          <Text className="text-sm font-semibold text-archive-300">
            {getTitleCountLabel(getListStats(lists).itemCount)}
          </Text>
        </View>

        {lists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            onEdit={() => onEditList(list)}
            onPress={() => router.push(`/lists/${list.id}`)}
          />
        ))}
      </View>
    </>
  );
}

export function ListsScreen() {
  const { loading: authLoading, user } = useAuth();
  const [formMode, setFormMode] = useState<ListFormMode>(null);
  const [selectedList, setSelectedList] = useState<UserListSummary | null>(null);
  const [confirmingDeleteList, setConfirmingDeleteList] =
    useState<UserListSummary | null>(null);
  const [formValues, setFormValues] = useState<ListFormValues>(
    EMPTY_LIST_FORM_VALUES,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const listsQuery = useUserLists(user?.id);
  const createListMutation = useCreateList();
  const updateListMutation = useUpdateList();
  const deleteListMutation = useDeleteList();
  const lists = listsQuery.data ?? [];
  const formErrors = useMemo(() => validateListForm(formValues), [formValues]);
  const isFormVisible = formMode != null;
  const isSubmitting =
    createListMutation.isPending || updateListMutation.isPending;
  const isDeleting = deleteListMutation.isPending;

  const resetForm = useCallback(() => {
    setFormMode(null);
    setSelectedList(null);
    setConfirmingDeleteList(null);
    setFormValues(EMPTY_LIST_FORM_VALUES);
    setSubmitError(null);
    setDeleteError(null);
  }, []);

  const startCreateList = useCallback(() => {
    setFormMode('create');
    setSelectedList(null);
    setConfirmingDeleteList(null);
    setFormValues(EMPTY_LIST_FORM_VALUES);
    setSubmitError(null);
    setDeleteError(null);
  }, []);

  const startEditList = useCallback((list: UserListSummary) => {
    setFormMode('edit');
    setSelectedList(list);
    setConfirmingDeleteList(null);
    setFormValues({
      description: list.description ?? '',
      name: list.name,
    });
    setSubmitError(null);
    setDeleteError(null);
  }, []);

  const updateFormValue = useCallback(
    <Key extends keyof ListFormValues>(key: Key, value: ListFormValues[Key]) => {
      setFormValues((currentValues) => ({
        ...currentValues,
        [key]: value,
      }));
      setSubmitError(null);
    },
    [],
  );

  const submitListForm = useCallback(async () => {
    if (!user || Object.keys(formErrors).length > 0) {
      return;
    }

    setSubmitError(null);

    try {
      if (formMode === 'edit' && selectedList) {
        await updateListMutation.mutateAsync({
          description: formValues.description,
          listId: selectedList.id,
          name: formValues.name,
          userId: user.id,
        });
      } else {
        await createListMutation.mutateAsync({
          description: formValues.description,
          name: formValues.name,
          userId: user.id,
        });
      }

      resetForm();
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    }
  }, [
    createListMutation,
    formErrors,
    formMode,
    formValues.description,
    formValues.name,
    resetForm,
    selectedList,
    updateListMutation,
    user,
  ]);

  const startDeleteList = useCallback(() => {
    if (selectedList) {
      setConfirmingDeleteList(selectedList);
      setDeleteError(null);
    }
  }, [selectedList]);

  const confirmDeleteList = useCallback(async () => {
    if (!user || !confirmingDeleteList) {
      return;
    }

    setDeleteError(null);

    try {
      await deleteListMutation.mutateAsync({
        listId: confirmingDeleteList.id,
        userId: user.id,
      });
      resetForm();
    } catch (error) {
      setDeleteError(getMutationErrorMessage(error));
    }
  }, [confirmingDeleteList, deleteListMutation, resetForm, user]);

  return (
    <Screen scroll className="gap-5">
      <View className="gap-4">
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <SectionHeader
              title="Lists"
              subtitle="Curate movies, series, and anime into custom collections."
            />
          </View>
          <Button
            title="Create"
            disabled={!user || authLoading}
            className="min-h-10 px-4"
            onPress={startCreateList}
          />
        </View>
      </View>

      {isFormVisible ? (
        <ListForm
          deleteError={deleteError}
          errors={formErrors}
          isDeleting={isDeleting}
          isSubmitting={isSubmitting}
          list={selectedList}
          submitError={submitError}
          values={formValues}
          onCancel={resetForm}
          onChange={updateFormValue}
          onDelete={formMode === 'edit' ? startDeleteList : undefined}
          onSubmit={submitListForm}
        />
      ) : null}

      {confirmingDeleteList ? (
        <DeleteListConfirmation
          error={deleteError}
          isDeleting={isDeleting}
          list={confirmingDeleteList}
          onCancel={() => {
            setConfirmingDeleteList(null);
            setDeleteError(null);
          }}
          onConfirm={confirmDeleteList}
        />
      ) : null}

      {authLoading ? <LoadingState message="Loading lists" /> : null}

      {!authLoading && !user ? (
        <EmptyState
          title="Sign in to view your lists"
          message="Your mixed-media collections will appear here after you sign in."
        />
      ) : null}

      {!authLoading && user && listsQuery.isLoading ? <ListsLoadingState /> : null}

      {!authLoading && user && listsQuery.isError ? (
        <ErrorState
          title="Lists unavailable"
          message={getListsErrorMessage(listsQuery.error)}
          retryLabel="Reload lists"
          onRetry={() => listsQuery.refetch()}
        />
      ) : null}

      {!authLoading && user && listsQuery.isSuccess ? (
        <ListsLoadedContent
          lists={lists}
          onCreateList={startCreateList}
          onEditList={startEditList}
        />
      ) : null}
    </Screen>
  );
}
