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
  canRateOrReviewReleaseDate,
  clearRatingAndReviewValues,
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

const SIGN_IN_REQUIRED_MESSAGE = 'Sign in before saving this journal entry.';
const MISSING_MEDIA_ITEM_MESSAGE = 'Open this modal from a title details page.';
const MISSING_DELETE_ENTRY_MESSAGE = 'This entry is not available to delete.';
const SAVE_ENTRY_FALLBACK_MESSAGE = 'Unable to save this journal entry.';
const DELETE_ENTRY_FALLBACK_MESSAGE = 'Unable to delete this journal entry.';
const LOAD_TITLE_FALLBACK_MESSAGE =
  'The title could not be loaded for this journal entry.';
const LOAD_ENTRY_FALLBACK_MESSAGE = 'Your journal entry could not be loaded.';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function hasFormErrors(errors: ReturnType<typeof validateJournalEntryForm>) {
  return Object.keys(errors).length > 0;
}

function getCompletedOnForStatus(
  status: JournalStatus,
  currentCompletedOn: string | null,
) {
  return status === 'completed' ? currentCompletedOn ?? todayString() : null;
}

function ModalEmptyState({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <JournalEntryModalFrame>
      <EmptyState
        title={title}
        message={message}
        actionLabel="Close"
        onAction={() => router.back()}
      />
    </JournalEntryModalFrame>
  );
}

function ModalErrorState({
  error,
  fallbackMessage,
  title,
  onRetry,
}: {
  error: unknown;
  fallbackMessage: string;
  title: string;
  onRetry: () => void;
}) {
  return (
    <JournalEntryModalFrame>
      <ErrorState
        title={title}
        message={getErrorMessage(error, fallbackMessage)}
        onRetry={onRetry}
      />
    </JournalEntryModalFrame>
  );
}

/**
 * Renders the add/edit journal entry modal for a title details page.
 *
 * @param entryId - Existing journal entry id when the modal edits an entry.
 * @param mediaItemId - Media route id used to load the title and journal entry.
 * @returns A modal form with save, edit, delete, loading, and error states.
 */
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
  const canRateOrReview = canRateOrReviewReleaseDate(item?.releaseDate);

  useEffect(() => {
    if (entry) {
      setValues(valuesFromJournalEntry(entry));
    } else if (!isEditMode) {
      setValues(createDefaultJournalEntryFormValues());
    }
  }, [entry, isEditMode]);

  useEffect(() => {
    if (!canRateOrReview) {
      setValues((current) => clearRatingAndReviewValues(current));
    }
  }, [canRateOrReview]);

  const clearMutationErrors = () => {
    setDeleteError(null);
    setSubmitError(null);
  };

  const updateFormValue = <Key extends keyof JournalEntryFormValues>(
    key: Key,
    value: JournalEntryFormValues[Key],
  ) => {
    clearMutationErrors();
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateJournalStatus = (status: JournalStatus) => {
    clearMutationErrors();
    setValues((current) => ({
      ...current,
      completedOn: getCompletedOnForStatus(status, current.completedOn),
      status,
    }));
  };

  const handleSubmit = async () => {
    if (hasFormErrors(errors)) {
      return;
    }

    if (!user?.id) {
      setSubmitError(SIGN_IN_REQUIRED_MESSAGE);
      return;
    }

    if (!mediaItemId) {
      setSubmitError(MISSING_MEDIA_ITEM_MESSAGE);
      return;
    }

    try {
      setSubmitError(null);

      if (resolvedEntryId) {
        await updateEntryMutation.mutateAsync({
          ...(canRateOrReview ? values : clearRatingAndReviewValues(values)),
          entryId: resolvedEntryId,
        });
      } else {
        await createEntryMutation.mutateAsync({
          ...(canRateOrReview ? values : clearRatingAndReviewValues(values)),
          mediaItemId,
          userId: user.id,
        });
      }

      router.back();
    } catch (error) {
      setSubmitError(getErrorMessage(error, SAVE_ENTRY_FALLBACK_MESSAGE));
    }
  };

  const confirmDeleteEntry = async () => {
    if (!resolvedEntryId) {
      setDeleteError(MISSING_DELETE_ENTRY_MESSAGE);
      return;
    }

    try {
      setDeleteError(null);
      await deleteEntryMutation.mutateAsync(resolvedEntryId);
      router.back();
    } catch (error) {
      setDeleteError(getErrorMessage(error, DELETE_ENTRY_FALLBACK_MESSAGE));
    }
  };

  const showDeleteConfirmation = () => {
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
      <ModalEmptyState
        title="Missing title"
        message={MISSING_MEDIA_ITEM_MESSAGE}
      />
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
      <ModalErrorState
        title="Unable to load title"
        error={detailsQuery.error}
        fallbackMessage={LOAD_TITLE_FALLBACK_MESSAGE}
        onRetry={() => detailsQuery.refetch()}
      />
    );
  }

  if (entryQuery.isError) {
    return (
      <ModalErrorState
        title="Unable to load entry"
        error={entryQuery.error}
        fallbackMessage={LOAD_ENTRY_FALLBACK_MESSAGE}
        onRetry={() => entryQuery.refetch()}
      />
    );
  }

  if (isEditMode && !entry) {
    return (
      <ModalEmptyState
        title="Entry not found"
        message="This journal entry is not available."
      />
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
          canRateOrReview={canRateOrReview}
          onChange={updateFormValue}
          onDelete={showDeleteConfirmation}
          onSubmit={handleSubmit}
          onStatusChange={updateJournalStatus}
          submitError={submitError}
          values={values}
        />
      </JournalEntryModalFrame>

      {isDeleteConfirmationVisible ? (
        <DeleteEntryConfirmation
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={handleCancelDelete}
          onConfirm={confirmDeleteEntry}
          title={item?.title}
        />
      ) : null}
    </>
  );
}
