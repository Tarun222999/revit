import { Ionicons } from '@expo/vector-icons';
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

function ListExampleChip({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-archive-600 px-3 py-2">
      <Text className="text-sm font-semibold text-gold-300">{label}</Text>
    </View>
  );
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
}: {
  lists: UserListSummary[];
  onCreateList: () => void;
}) {
  if (lists.length === 0) {
    return (
      <Card className="gap-5 p-5">
        <View className="flex-row items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-shelf-700">
            <Ionicons color="#f4c95d" name="albums" size={22} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-xl font-bold text-archive-50">
              Build your first collection
            </Text>
            <Text className="text-sm leading-5 text-archive-300">
              Lists are for hand-picked shelves that mix movies, series, and
              anime without changing the journal log.
            </Text>
          </View>
        </View>

        <View className="gap-3 rounded-app border border-archive-700 bg-archive-900 p-4">
          <Text className="text-xs font-bold uppercase text-archive-300">
            A few good starters
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <ListExampleChip label="Favorites" />
            <ListExampleChip label="Watch Next" />
            <ListExampleChip label="Best Endings" />
          </View>
        </View>

        <View className="gap-3">
          <Button title="Create List" onPress={onCreateList} />
          <Button
            title="Find Titles"
            variant="secondary"
            onPress={() => router.push('/search')}
          />
        </View>
      </Card>
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
            onPress={() => router.push(`/lists/${list.id}`)}
          />
        ))}
      </View>
    </>
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

  const resetForm = useCallback(() => {
    setIsCreatingList(false);
    setFormValues(EMPTY_LIST_FORM_VALUES);
    setTouchedFields({});
    setHasSubmittedForm(false);
    setSubmitError(null);
  }, []);

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

    if (!user || Object.keys(formErrors).length > 0) {
      return;
    }

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
    }
  }, [
    createListMutation,
    formErrors,
    formValues.description,
    formValues.name,
    resetForm,
    user,
  ]);

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
          {!isCreatingList ? (
            <Button
              title="Create"
              disabled={!user || authLoading}
              className="min-h-10 px-4"
              onPress={startCreateList}
            />
          ) : null}
        </View>
      </View>

      {!authLoading && user && isCreatingList ? (
        <ListForm
          errors={visibleFormErrors}
          hasSubmitted={hasSubmittedForm}
          isSubmitting={isSubmitting}
          submitError={submitError}
          touchedFields={touchedFields}
          values={formValues}
          onBlurField={markFieldTouched}
          onCancel={resetForm}
          onChange={updateFormValue}
          onSubmit={submitListForm}
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

      {!authLoading && user && listsQuery.isSuccess && !isCreatingList ? (
        <ListsLoadedContent
          lists={lists}
          onCreateList={startCreateList}
        />
      ) : null}
    </Screen>
  );
}
