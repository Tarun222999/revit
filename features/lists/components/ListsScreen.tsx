import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CollectionSheet } from '@/features/lists/components/CollectionSheet';
import { useCollectionDismiss } from '@/features/lists/hooks/useCollectionDismiss';
import {
  hasDuplicateListName,
  recentCollections,
} from '@/features/lists/model/listPresentation';
import { collectionTitleStyle } from '@/features/lists/components/ListCard';
import { ListCard } from '@/features/lists/components/ListCard';
import {
  getVisibleListFormErrors,
  ListForm,
  validateListForm,
  type ListFormTouchedFields,
  type ListFormValues,
} from '@/features/lists/components/ListForm';
import { useCreateList } from '@/features/lists/hooks/useListMutations';
import { useUserLists } from '@/features/lists/hooks/useUserLists';
import type { UserListSummary } from '@/features/lists/types';

const LISTS_LOADING_PLACEHOLDER_COUNT = 3;
const EMPTY_LIST_FORM_VALUES: ListFormValues = {
  description: '',
  name: '',
};

function getListsErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to load your lists right now.';
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

  return error instanceof Error
    ? error.message
    : 'Unable to save this list right now.';
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

function ListsLoadedContent({
  lists,
  onCreateList,
}: {
  lists: UserListSummary[];
  onCreateList: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 350 || fontScale > 1.3 ? 1 : 2;
  const [featured, ...shelf] = recentCollections(lists);
  if (!featured)
    return (
      <EmptyState
        title="Start with an obsession."
        message="A favorite genre, a feeling, a filmmaker. Make a home for the stories you love."
        actionLabel="Make your first list"
        onAction={onCreateList}
      />
    );
  return (
    <View className="gap-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-semibold text-archive-50">
          Your collections
        </Text>
        <Text className="text-sm text-archive-300">
          {lists.length} {lists.length === 1 ? 'list' : 'lists'}
        </Text>
      </View>
      <ListCard
        featured
        list={featured}
        onPress={() => router.push(`/lists/${featured.id}`)}
      />
      {shelf.length ? (
        <>
          <Text className="text-base font-semibold text-archive-50">
            On your shelf
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-6">
            {shelf.map((list) => (
              <View
                key={list.id}
                style={{ width: columns === 1 ? '100%' : '47%' }}
              >
                <ListCard
                  list={list}
                  onPress={() => router.push(`/lists/${list.id}`)}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}
      <View className="flex-row items-center gap-3 border-t border-archive-700 py-5">
        <Ionicons name="lock-closed-outline" size={20} color="#e8c77d" />
        <Text className="flex-1 text-sm leading-6 text-archive-300">
          A little corner of your own. Your lists and notes are private.
        </Text>
      </View>
    </View>
  );
}

export function ListsScreen() {
  const { loading: authLoading, user } = useAuth();
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [formValues, setFormValues] = useState<ListFormValues>(
    EMPTY_LIST_FORM_VALUES,
  );
  const [touchedFields, setTouchedFields] = useState<ListFormTouchedFields>({});
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const listsQuery = useUserLists(user?.id);
  const createListMutation = useCreateList();
  const lists = listsQuery.data ?? [];
  const formErrors = useMemo(() => validateListForm(formValues), [formValues]);
  const visibleFormErrors = useMemo(
    () => getVisibleListFormErrors(formErrors, touchedFields, hasSubmittedForm),
    [formErrors, hasSubmittedForm, touchedFields],
  );
  const isSubmitting = createListMutation.isPending;
  const submitting = useRef(false);

  const resetForm = useCallback(() => {
    setIsCreatingList(false);
    setFormValues(EMPTY_LIST_FORM_VALUES);
    setTouchedFields({});
    setHasSubmittedForm(false);
    setSubmitError(null);
  }, []);

  const dismissCreate = useCollectionDismiss(
    isCreatingList,
    Boolean(formValues.name || formValues.description),
    isSubmitting || submitting.current,
    resetForm,
  );

  const startCreateList = useCallback(() => {
    setIsCreatingList(true);
    setFormValues(EMPTY_LIST_FORM_VALUES);
    setTouchedFields({});
    setHasSubmittedForm(false);
    setSubmitError(null);
  }, []);

  const markFieldTouched = useCallback((key: keyof ListFormValues) => {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [key]: true,
    }));
  }, []);

  const updateFormValue = useCallback(
    <Key extends keyof ListFormValues>(
      key: Key,
      value: ListFormValues[Key],
    ) => {
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

    if (!user || submitting.current || Object.keys(formErrors).length > 0) {
      return;
    }

    if (hasDuplicateListName(lists, formValues.name)) {
      setSubmitError('A list with this name already exists.');
      return;
    }
    submitting.current = true;
    setSubmitError(null);

    try {
      const list = await createListMutation.mutateAsync({
        description: formValues.description,
        name: formValues.name,
        userId: user.id,
      });

      resetForm();
      router.push(`/lists/${list.id}`);
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    } finally {
      submitting.current = false;
    }
  }, [
    createListMutation,
    formErrors,
    lists,
    formValues.description,
    formValues.name,
    resetForm,
    user,
  ]);

  return (
    <Screen scroll className="gap-5">
      {!isCreatingList ? (
        <View className="gap-3">
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <Text
              className="text-4xl text-archive-50"
              style={collectionTitleStyle}
            >
              Lists
            </Text>
            <Button
              title="New list"
              disabled={!user || authLoading}
              className="px-4"
              onPress={startCreateList}
            />
          </View>
          <Text className="text-sm leading-6 text-archive-300">
            A place for every obsession.
          </Text>
        </View>
      ) : null}

      {!authLoading && user && isCreatingList ? (
        <CollectionSheet
          title="New list"
          onClose={dismissCreate}
          busy={isSubmitting}
        >
          <ListForm
            errors={visibleFormErrors}
            hasSubmitted={hasSubmittedForm}
            isSubmitting={isSubmitting}
            submitError={submitError}
            touchedFields={touchedFields}
            values={formValues}
            onBlurField={markFieldTouched}
            onCancel={dismissCreate}
            onChange={updateFormValue}
            onSubmit={submitListForm}
          />
        </CollectionSheet>
      ) : null}

      {authLoading ? <LoadingState message="Loading lists" /> : null}

      {!authLoading && !user ? (
        <EmptyState
          title="Sign in to view your lists"
          message="Your mixed-media collections will appear here after you sign in."
        />
      ) : null}

      {!authLoading && user && listsQuery.isLoading ? (
        <ListsLoadingState />
      ) : null}

      {!authLoading && user && listsQuery.isError ? (
        <ErrorState
          title="Lists unavailable"
          message={getListsErrorMessage(listsQuery.error)}
          retryLabel="Reload lists"
          onRetry={() => listsQuery.refetch()}
        />
      ) : null}

      {!authLoading && user && listsQuery.isSuccess ? (
        <ListsLoadedContent lists={lists} onCreateList={startCreateList} />
      ) : null}
    </Screen>
  );
}
