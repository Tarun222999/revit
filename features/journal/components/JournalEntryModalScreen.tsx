import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import type { JournalStatus } from '@/constants/journal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { JournalEntryForm } from '@/features/journal/components/JournalEntryForm';
import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useUpdateJournalEntry,
} from '@/features/journal/hooks/useJournalEntryMutations';
import { useJournalEntryForMedia } from '@/features/journal/hooks/useJournalEntryForMedia';
import {
  defaultJournalEntryFormValues,
  todayString,
  validateJournalEntryForm,
  valuesFromJournalEntry,
} from '@/features/journal/model/journalEntryForm';
import type { JournalEntryFormValues } from '@/features/journal/types';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';

type JournalEntryModalScreenProps = {
  mediaItemId?: string;
  entryId?: string;
};

type JournalEntryModalFrameProps = {
  children: React.ReactNode;
  scroll?: boolean;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function JournalEntryModalFrame({
  children,
  scroll = false,
}: JournalEntryModalFrameProps) {
  const contentClassName = scroll ? 'gap-5 px-5 py-5' : 'p-5';

  return (
    <SafeAreaView
      className="flex-1 justify-end px-3 pt-8"
      edges={['top', 'right', 'bottom', 'left']}
      style={{ backgroundColor: 'rgba(13, 11, 9, 0.72)' }}
    >
      <View className="max-h-[92%] w-full max-w-xl self-center overflow-hidden rounded-app border border-archive-700 bg-archive-900">
        <View className="flex-row items-center justify-between gap-4 border-b border-archive-700 px-5 py-4">
          <Text
            className="min-w-0 flex-1 text-lg font-bold text-archive-50"
            numberOfLines={1}
          >
            Journal Entry
          </Text>
          <Pressable
            accessibilityRole="button"
            className="rounded-app border border-archive-700 px-3 py-2"
            onPress={() => router.back()}
          >
            <Text className="text-sm font-semibold text-archive-100">Close</Text>
          </Pressable>
        </View>
        {scroll ? (
          <ScrollView
            className="min-h-0"
            contentContainerClassName={contentClassName}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View className={contentClassName}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

export function JournalEntryModalScreen({
  entryId,
  mediaItemId,
}: JournalEntryModalScreenProps) {
  const { user } = useAuth();
  const detailsQuery = useMediaDetails(mediaItemId);
  const entryQuery = useJournalEntryForMedia(user?.id, mediaItemId);
  const createEntryMutation = useCreateJournalEntry();
  const deleteEntryMutation = useDeleteJournalEntry();
  const updateEntryMutation = useUpdateJournalEntry();
  const item = detailsQuery.data?.item;
  const entry = entryQuery.data ?? null;
  const resolvedEntryId = entryId ?? entry?.id;
  const isEditMode = Boolean(resolvedEntryId);
  const isSubmitting =
    createEntryMutation.isPending || updateEntryMutation.isPending;
  const isDeleting = deleteEntryMutation.isPending;
  const [values, setValues] = useState<JournalEntryFormValues>(
    defaultJournalEntryFormValues,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = useMemo(() => validateJournalEntryForm(values), [values]);

  useEffect(() => {
    if (entry) {
      setValues(valuesFromJournalEntry(entry));
    } else if (!isEditMode) {
      setValues(defaultJournalEntryFormValues);
    }
  }, [entry, isEditMode]);

  const updateValue = <Key extends keyof JournalEntryFormValues>(
    key: Key,
    value: JournalEntryFormValues[Key],
  ) => {
    setDeleteError(null);
    setSubmitError(null);
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateStatus = (status: JournalStatus) => {
    setDeleteError(null);
    setSubmitError(null);
    setValues((current) => ({
      ...current,
      completedOn:
        status === 'completed' ? current.completedOn ?? todayString() : null,
      status,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!user?.id) {
      setSubmitError('Sign in before saving this journal entry.');
      return;
    }

    if (!mediaItemId) {
      setSubmitError('Open this modal from a title details page.');
      return;
    }

    try {
      setSubmitError(null);

      if (resolvedEntryId) {
        await updateEntryMutation.mutateAsync({
          ...values,
          entryId: resolvedEntryId,
        });
      } else {
        await createEntryMutation.mutateAsync({
          ...values,
          mediaItemId,
          userId: user.id,
        });
      }

      router.back();
    } catch (error) {
      setSubmitError(errorMessage(error, 'Unable to save this journal entry.'));
    }
  };

  const deleteEntry = async () => {
    if (!resolvedEntryId) {
      setDeleteError('This entry is not available to delete.');
      return;
    }

    try {
      setDeleteError(null);
      await deleteEntryMutation.mutateAsync(resolvedEntryId);
      router.back();
    } catch (error) {
      setDeleteError(errorMessage(error, 'Unable to delete this journal entry.'));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete journal entry?',
      'This removes your status, rating, and review for this title.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: deleteEntry,
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  };

  if (!mediaItemId) {
    return (
      <JournalEntryModalFrame>
        <EmptyState
          title="Missing title"
          message="Open this modal from a title details page."
          actionLabel="Close"
          onAction={() => router.back()}
        />
      </JournalEntryModalFrame>
    );
  }

  if (detailsQuery.isLoading || entryQuery.isLoading) {
    return (
      <JournalEntryModalFrame>
        <LoadingState message="Loading journal entry" />
      </JournalEntryModalFrame>
    );
  }

  if (detailsQuery.isError) {
    return (
      <JournalEntryModalFrame>
        <ErrorState
          title="Unable to load title"
          message={errorMessage(
            detailsQuery.error,
            'The title could not be loaded for this journal entry.',
          )}
          onRetry={() => detailsQuery.refetch()}
        />
      </JournalEntryModalFrame>
    );
  }

  if (entryQuery.isError) {
    return (
      <JournalEntryModalFrame>
        <ErrorState
          title="Unable to load entry"
          message={errorMessage(
            entryQuery.error,
            'Your journal entry could not be loaded.',
          )}
          onRetry={() => entryQuery.refetch()}
        />
      </JournalEntryModalFrame>
    );
  }

  if (isEditMode && !entry) {
    return (
      <JournalEntryModalFrame>
        <EmptyState
          title="Entry not found"
          message="This journal entry is not available."
          actionLabel="Close"
          onAction={() => router.back()}
        />
      </JournalEntryModalFrame>
    );
  }

  return (
    <JournalEntryModalFrame scroll>
      <JournalEntryForm
        canDelete={Boolean(resolvedEntryId)}
        deleteError={deleteError}
        errors={errors}
        isEditMode={isEditMode}
        isDeleting={isDeleting}
        isSubmitting={isSubmitting}
        item={item}
        onChange={updateValue}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        onStatusChange={updateStatus}
        submitError={submitError}
        values={values}
      />
    </JournalEntryModalFrame>
  );
}
