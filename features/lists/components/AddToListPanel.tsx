import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import {
  getVisibleListFormErrors,
  validateListForm,
  type ListFormTouchedFields,
  type ListFormValues,
} from '@/features/lists/components/ListForm';
import {
  useAddMediaItemToList,
  useCreateList,
  useRemoveListItem,
} from '@/features/lists/hooks/useListMutations';
import { useMediaListMemberships } from '@/features/lists/hooks/useMediaListMemberships';
import { useUserLists } from '@/features/lists/hooks/useUserLists';
import type { MediaListMembership, UserListSummary } from '@/features/lists/types';
import { cn } from '@/lib/utils/cn';

type AddToListPanelProps = {
  mediaItemId: string;
  onClose: () => void;
  userId: string;
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

function getMembershipMap(memberships: MediaListMembership[]) {
  return new Map(memberships.map((membership) => [membership.listId, membership]));
}

function SavedCheckControl({
  isPending,
  isSelected,
}: {
  isPending: boolean;
  isSelected: boolean;
}) {
  return (
    <View
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full border',
        isSelected
          ? 'border-gold-400 bg-gold-400'
          : 'border-archive-500 bg-transparent',
      )}>
      {isPending ? (
        <ActivityIndicator color={isSelected ? '#0d0b09' : '#fbf6ec'} />
      ) : isSelected ? (
        <Ionicons color="#0d0b09" name="checkmark" size={20} />
      ) : null}
    </View>
  );
}

function MembershipRow({
  isPending,
  list,
  membership,
  onToggle,
}: {
  isPending: boolean;
  list: UserListSummary;
  membership?: MediaListMembership;
  onToggle: () => void;
}) {
  const isSelected = Boolean(membership);

  return (
    <Pressable
      accessibilityLabel={
        isSelected
          ? `${list.name} is saved. Double tap to remove from this list.`
          : `${list.name} is not saved. Double tap to save to this list.`
      }
      accessibilityRole="button"
      className="rounded-app border border-archive-700 bg-archive-800 p-3"
      disabled={isPending}
      onPress={onToggle}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-bold text-archive-50" numberOfLines={1}>
            {list.name}
          </Text>
          <Text className="text-sm text-archive-300" numberOfLines={1}>
            {getItemCountLabel(list.itemCount)}
            {list.description ? ` - ${list.description}` : ''}
          </Text>
          {isSelected ? (
            <Text className="text-xs font-semibold text-gold-300">Saved here</Text>
          ) : null}
        </View>

        <SavedCheckControl isPending={isPending} isSelected={isSelected} />
      </View>
    </Pressable>
  );
}

function QuickCreateListForm({
  error,
  hasSubmitted,
  isSubmitting,
  onCancel,
  onBlurField,
  onChange,
  onSubmit,
  showCancel,
  touchedFields,
  values,
}: {
  error?: string | null;
  hasSubmitted: boolean;
  isSubmitting: boolean;
  onCancel?: () => void;
  onBlurField: (key: keyof ListFormValues) => void;
  onChange: <Key extends keyof ListFormValues>(
    key: Key,
    value: ListFormValues[Key],
  ) => void;
  onSubmit: () => void;
  showCancel: boolean;
  touchedFields: ListFormTouchedFields;
  values: ListFormValues;
}) {
  const errors = useMemo(() => validateListForm(values), [values]);
  const visibleErrors = useMemo(
    () => getVisibleListFormErrors(errors, touchedFields, hasSubmitted),
    [errors, hasSubmitted, touchedFields],
  );
  const hasVisibleValidationErrors = Object.keys(visibleErrors).length > 0;

  return (
    <View className="gap-4 rounded-app border border-archive-700 bg-archive-800 p-4">
      <View className="gap-1">
        <Text className="text-lg font-bold text-archive-50">New List</Text>
        <Text className="text-sm leading-5 text-archive-300">
          Create a mixed-media list and save this title to it.
        </Text>
      </View>

      <TextField
        error={visibleErrors.name}
        label="Name"
        maxLength={80}
        onBlur={() => onBlurField('name')}
        onChangeText={(name) => onChange('name', name)}
        placeholder="Watch Next"
        value={values.name}
      />

      <TextField
        className="min-h-20 py-3"
        error={visibleErrors.description}
        label="Description"
        maxLength={280}
        multiline
        onBlur={() => onBlurField('description')}
        onChangeText={(description) => onChange('description', description)}
        placeholder="Optional note about this collection"
        textAlignVertical="top"
        value={values.description}
      />

      {hasVisibleValidationErrors ? (
        <Text className="text-sm leading-5 text-reel-400">
          Fix the highlighted fields before saving.
        </Text>
      ) : null}

      {error ? (
        <Text className="text-sm leading-5 text-reel-400">{error}</Text>
      ) : null}

      <View className="gap-3">
        <Button
          loading={isSubmitting}
          onPress={onSubmit}
          title="Create and Save"
        />
        {showCancel && onCancel ? (
          <Button
            disabled={isSubmitting}
            onPress={onCancel}
            title="Cancel"
            variant="secondary"
          />
        ) : null}
      </View>
    </View>
  );
}

export function AddToListPanel({
  mediaItemId,
  onClose,
  userId,
}: AddToListPanelProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const listsQuery = useUserLists(userId);
  const membershipsQuery = useMediaListMemberships(userId, mediaItemId);
  const createListMutation = useCreateList();
  const addMutation = useAddMediaItemToList();
  const removeMutation = useRemoveListItem();
  const lists = listsQuery.data ?? [];
  const memberships = membershipsQuery.data ?? [];
  const membershipMap = getMembershipMap(memberships);
  const mutationError = addMutation.error ?? removeMutation.error;
  const isLoading = listsQuery.isLoading || membershipsQuery.isLoading;
  const isError = listsQuery.isError || membershipsQuery.isError;
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [createValues, setCreateValues] = useState<ListFormValues>(
    EMPTY_LIST_FORM_VALUES,
  );
  const [touchedCreateFields, setTouchedCreateFields] =
    useState<ListFormTouchedFields>({});
  const [hasSubmittedCreateForm, setHasSubmittedCreateForm] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const showQuickCreate = lists.length === 0 || isCreatingNewList;
  const panelMaxHeight = Math.max(360, height - insets.top - 32);
  const isCreatingAndSaving =
    createListMutation.isPending || addMutation.isPending;

  const markCreateFieldTouched = (key: keyof ListFormValues) => {
    setTouchedCreateFields((currentFields) => ({
      ...currentFields,
      [key]: true,
    }));
  };

  const updateCreateValue = <Key extends keyof ListFormValues>(
    key: Key,
    value: ListFormValues[Key],
  ) => {
    setCreateValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
    markCreateFieldTouched(key);
    setCreateError(null);
  };

  const resetCreateForm = () => {
    setIsCreatingNewList(false);
    setCreateValues(EMPTY_LIST_FORM_VALUES);
    setTouchedCreateFields({});
    setHasSubmittedCreateForm(false);
    setCreateError(null);
  };

  const toggleListMembership = (list: UserListSummary) => {
    const membership = membershipMap.get(list.id);

    if (membership) {
      removeMutation.mutate({
        listItemId: membership.listItemId,
        mediaItemId,
        userId,
      });
      return;
    }

    addMutation.mutate({
      listId: list.id,
      mediaItemId,
      userId,
    });
  };

  const createListAndSaveTitle = async () => {
    setHasSubmittedCreateForm(true);
    const errors = validateListForm(createValues);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setCreateError(null);
      const list = await createListMutation.mutateAsync({
        description: createValues.description,
        name: createValues.name,
        userId,
      });

      await addMutation.mutateAsync({
        listId: list.id,
        mediaItemId,
        userId,
      });

      resetCreateForm();
      await Promise.all([listsQuery.refetch(), membershipsQuery.refetch()]);
    } catch (error) {
      setCreateError(getMutationErrorMessage(error));
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible>
      <SafeAreaView
        className="flex-1"
        edges={['top', 'right', 'bottom', 'left']}
        style={{ backgroundColor: 'rgba(13, 11, 9, 0.72)' }}>
        <Pressable className="flex-1 justify-end px-3 pt-8" onPress={onClose}>
          <Pressable
            className="w-full max-w-xl self-center overflow-hidden rounded-app border border-archive-700 bg-archive-900"
            onPress={(event) => event.stopPropagation()}
            style={{ maxHeight: panelMaxHeight }}>
            <View className="flex-row items-center justify-between gap-4 border-b border-archive-700 px-5 py-4">
              <View className="min-w-0 flex-1 gap-1">
                <Text
                  className="text-lg font-bold text-archive-50"
                  numberOfLines={1}>
                  Add to List
                </Text>
                <Text className="text-sm leading-5 text-archive-300">
                  Save this title to one or more mixed-media collections.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close add to list"
                accessibilityRole="button"
                hitSlop={10}
                className="h-10 w-10 items-center justify-center rounded-full border border-archive-700 bg-archive-800"
                onPress={onClose}>
                <Ionicons color="#fbf6ec" name="close" size={20} />
              </Pressable>
            </View>

            <ScrollView
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              className="min-h-0"
              contentContainerClassName="gap-4 px-5 py-5"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => Keyboard.dismiss()}
              showsVerticalScrollIndicator={false}>
              {isLoading ? <LoadingState message="Loading lists" /> : null}

              {isError ? (
                <ErrorState
                  title="Lists unavailable"
                  message={getErrorMessage(
                    listsQuery.error ?? membershipsQuery.error,
                    'Unable to load your lists right now.',
                  )}
                  retryLabel="Reload lists"
                  onRetry={() => {
                    listsQuery.refetch();
                    membershipsQuery.refetch();
                  }}
                />
              ) : null}

              {!isLoading && !isError && lists.length > 0 ? (
                <View className="gap-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-base font-bold text-archive-50">
                      Your Lists
                    </Text>
                    {!showQuickCreate ? (
                      <Pressable
                        accessibilityRole="button"
                        className="min-h-8 justify-center rounded-full border border-archive-600 px-3"
                        onPress={() => {
                          setIsCreatingNewList(true);
                          setTouchedCreateFields({});
                          setHasSubmittedCreateForm(false);
                          setCreateError(null);
                        }}>
                        <Text className="text-xs font-semibold text-gold-300">
                          New List
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {lists.map((list) => {
                    const membership = membershipMap.get(list.id);
                    const isPending =
                      addMutation.isPending &&
                      addMutation.variables?.listId === list.id
                        ? true
                        : removeMutation.isPending &&
                          removeMutation.variables?.listItemId ===
                            membership?.listItemId;

                    return (
                      <MembershipRow
                        isPending={isPending}
                        key={list.id}
                        list={list}
                        membership={membership}
                        onToggle={() => toggleListMembership(list)}
                      />
                    );
                  })}
                </View>
              ) : null}

              {!isLoading && !isError && showQuickCreate ? (
                <QuickCreateListForm
                  error={createError}
                  hasSubmitted={hasSubmittedCreateForm}
                  isSubmitting={isCreatingAndSaving}
                  showCancel={lists.length > 0}
                  touchedFields={touchedCreateFields}
                  values={createValues}
                  onBlurField={markCreateFieldTouched}
                  onCancel={resetCreateForm}
                  onChange={updateCreateValue}
                  onSubmit={createListAndSaveTitle}
                />
              ) : null}

              {mutationError ? (
                <Text className="text-sm leading-5 text-reel-400">
                  {getErrorMessage(
                    mutationError,
                    'Unable to update list membership.',
                  )}
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
