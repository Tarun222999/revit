import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import type { JournalStatus } from '@/constants/journal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DeleteEntryConfirmation } from '@/features/journal/components/DeleteEntryConfirmation';
import { JournalEntryForm } from '@/features/journal/components/JournalEntryForm';
import { JournalEntryModalFrame } from '@/features/journal/components/JournalEntryModalFrame';
import {
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useUpdateJournalEntry,
} from '@/features/journal/hooks/useJournalEntryMutations';
import { useJournalEntryForMedia } from '@/features/journal/hooks/useJournalEntryForMedia';
import {
  createDefaultJournalEntryFormValues,
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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
    createDefaultJournalEntryFormValues,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] =
    useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errors = useMemo(() => validateJournalEntryForm(values), [values]);

  useEffect(() => {
    if (entry) {
      setValues(valuesFromJournalEntry(entry));
    } else if (!isEditMode) {
      setValues(createDefaultJournalEntryFormValues());
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
    setDeleteError(null);
    setIsDeleteConfirmationVisible(true);
  };

  const handleCancelDelete = () => {
    if (isDeleting) {
      return;
    }

    setDeleteError(null);
    setIsDeleteConfirmationVisible(false);
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
    <>
      <JournalEntryModalFrame scroll>
        <JournalEntryForm
          canDelete={Boolean(resolvedEntryId)}
          deleteError={isDeleteConfirmationVisible ? null : deleteError}
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

      {isDeleteConfirmationVisible ? (
        <DeleteEntryConfirmation
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={handleCancelDelete}
          onConfirm={deleteEntry}
          title={item?.title}
        />
      ) : null}
    </>
  );
}
