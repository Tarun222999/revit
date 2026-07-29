import { usePreventRemove } from '@react-navigation/native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { JournalEntryModalFrame } from '@/features/journal/components/JournalEntryModalFrame';
import { JournalIntentForm } from '@/features/journal/components/JournalIntentForm';
import {
  useLogJournalEvent,
  useSaveJournalPlan,
  useUpdateJournalEvent,
} from '@/features/journal/hooks/useJournalLifecycleMutations';
import {
  useJournalEvent,
  useJournalTitleSummary,
} from '@/features/journal/hooks/useJournalReads';
import {
  createJournalIntentFormValues,
  createJournalRequestId,
  hasJournalIntentFormChanged,
  hasJournalIntentFormErrors,
  isJournalFormIntent,
  isPlanningIntent,
  JOURNAL_INTENT_COPY,
  lifecycleIntentForForm,
  localToday,
  validateJournalIntentForm,
} from '@/features/journal/model/journalIntentForm';
import type {
  JournalFormIntent,
  JournalIntentFormValues,
  JournalLifecycleSource,
} from '@/features/journal/types';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';

type JournalEntryModalScreenProps = {
  eventId?: string;
  intent?: string;
  mediaItemId?: string;
  returnToJournal?: boolean;
  source?: string;
};

const FALLBACK_SAVE_ERROR = 'Unable to save this Journal change.';

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isLifecycleSource(value?: string): value is JournalLifecycleSource {
  return (
    value === 'history' ||
    value === 'planned_title' ||
    value === 'planner' ||
    value === 'title'
  );
}

function ModalMessage({
  message,
  onClose = () => router.back(),
  title,
}: {
  message: string;
  onClose?: () => void;
  title: string;
}) {
  return (
    <JournalEntryModalFrame title={title}>
      <EmptyState
        actionLabel="Close"
        message={message}
        onAction={onClose}
        title={title}
      />
    </JournalEntryModalFrame>
  );
}

export function JournalEntryModalScreen({
  eventId,
  intent: intentParam,
  mediaItemId,
  returnToJournal = false,
  source: sourceParam,
}: JournalEntryModalScreenProps) {
  const intent: JournalFormIntent = isJournalFormIntent(intentParam)
    ? intentParam
    : 'log';
  const source: JournalLifecycleSource = isLifecycleSource(sourceParam)
    ? sourceParam
    : intent === 'previous_watch' || intent === 'edit_event'
      ? 'history'
      : 'title';
  const { user } = useAuth();
  const detailsQuery = useMediaDetails(mediaItemId);
  const summaryQuery = useJournalTitleSummary(user?.id, mediaItemId);
  const eventQuery = useJournalEvent(
    user?.id,
    intent === 'edit_event' ? eventId : undefined,
  );
  const savePlan = useSaveJournalPlan();
  const logEvent = useLogJournalEvent();
  const updateEvent = useUpdateJournalEvent();
  const mutationPending =
    savePlan.isPending || logEvent.isPending || updateEvent.isPending;
  const requestIdRef = useRef(createJournalRequestId());
  const [allowDismiss, setAllowDismiss] = useState(false);
  const initializedEditRef = useRef(false);
  const initialValuesRef = useRef(createJournalIntentFormValues(intent));
  const [values, setValues] = useState(initialValuesRef.current);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const today = localToday();
  const errors = useMemo(
    () => validateJournalIntentForm(intent, values, today),
    [intent, today, values],
  );
  const isDirty = hasJournalIntentFormChanged(initialValuesRef.current, values);
  const copy = JOURNAL_INTENT_COPY[intent];
  const closeModal = () => {
    if (returnToJournal) router.dismissTo('/journal');
    else router.back();
  };

  useEffect(() => {
    if (initializedEditRef.current) return;

    if (intent === 'edit_plan' && summaryQuery.isSuccess) {
      const nextValues = createJournalIntentFormValues(intent, {
        plannedFor: summaryQuery.data?.titleState.activePlan?.plannedFor,
      });
      initialValuesRef.current = nextValues;
      setValues(nextValues);
      initializedEditRef.current = true;
    }

    if (intent === 'edit_event' && eventQuery.data) {
      const nextValues = createJournalIntentFormValues(intent, {
        event: eventQuery.data,
      });
      initialValuesRef.current = nextValues;
      setValues(nextValues);
      initializedEditRef.current = true;
    }
  }, [eventQuery.data, intent, summaryQuery.data, summaryQuery.isSuccess]);

  usePreventRemove((returnToJournal || isDirty) && !allowDismiss, () => {
    if (!isDirty) {
      setAllowDismiss(true);
      setTimeout(closeModal, 0);
      return;
    }
    Alert.alert(
      'Discard changes?',
      'Your unsaved Journal changes will be lost.',
      [
        { style: 'cancel', text: 'Keep editing' },
        {
          style: 'destructive',
          text: 'Discard',
          onPress: () => {
            setAllowDismiss(true);
            setTimeout(closeModal, 0);
          },
        },
      ],
    );
  });

  const requestDismiss = () => {
    if (mutationPending) return;
    if (!isDirty) {
      closeModal();
      return;
    }

    Alert.alert(
      'Discard changes?',
      'Your unsaved Journal changes will be lost.',
      [
        { style: 'cancel', text: 'Keep editing' },
        {
          style: 'destructive',
          text: 'Discard',
          onPress: () => {
            setAllowDismiss(true);
            setTimeout(closeModal, 0);
          },
        },
      ],
    );
  };

  const updateValue = <Key extends keyof JournalIntentFormValues>(
    key: Key,
    value: JournalIntentFormValues[Key],
  ) => {
    setSubmitError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  const finishSuccessfully = () => {
    setAllowDismiss(true);
    AccessibilityInfo.announceForAccessibility(`${copy.submitLabel} saved`);
    setTimeout(closeModal, 0);
  };

  const submit = async () => {
    if (mutationPending || hasJournalIntentFormErrors(errors)) return;
    if (!user?.id || !mediaItemId) {
      setSubmitError('Sign in and reopen this title before saving.');
      return;
    }

    try {
      setSubmitError(null);

      if (isPlanningIntent(intent)) {
        await savePlan.mutateAsync({ mediaItemId, plannedFor: values.date, today });
      } else if (intent === 'edit_event') {
        if (!eventId || !values.date) throw new Error('This activity is unavailable.');
        await updateEvent.mutateAsync({
          eventDate: values.date,
          eventId,
          notes: values.notes.trim(),
          rating: eventQuery.data?.type === 'completed' ? values.rating : null,
          today,
        });
      } else {
        if (!values.date) throw new Error('Choose a date.');
        await logEvent.mutateAsync({
          eventDate: values.date,
          intent: lifecycleIntentForForm(intent),
          mediaItemId,
          notes: values.notes.trim(),
          rating:
            intent === 'finish' ||
            intent === 'log' ||
            intent === 'previous_watch' ||
            intent === 'rewatch'
              ? values.rating
              : null,
          requestId: requestIdRef.current,
          source,
          today,
        });
      }

      finishSuccessfully();
    } catch (error) {
      setSubmitError(errorMessage(error, FALLBACK_SAVE_ERROR));
    }
  };

  if (!user?.id) {
    return (
      <ModalMessage
        message="Sign in before adding plans or activity to your Journal."
        onClose={closeModal}
        title="Sign in required"
      />
    );
  }

  if (!mediaItemId) {
    return (
      <ModalMessage
        message="Open this from a title."
        onClose={closeModal}
        title="Missing title"
      />
    );
  }

  const loadingEdit =
    (intent === 'edit_plan' && summaryQuery.isLoading) ||
    (intent === 'edit_event' && eventQuery.isLoading);
  if (detailsQuery.isLoading || loadingEdit) {
    return (
      <JournalEntryModalFrame title={copy.title} onClose={requestDismiss}>
        <LoadingState message={`Loading ${copy.title.toLowerCase()}`} />
      </JournalEntryModalFrame>
    );
  }

  const loadError = detailsQuery.error ??
    (intent === 'edit_plan' ? summaryQuery.error : eventQuery.error);
  if (loadError) {
    return (
      <JournalEntryModalFrame title={copy.title} onClose={requestDismiss}>
        <ErrorState
          message={errorMessage(loadError, 'Unable to load this Journal form.')}
          onRetry={() => {
            void detailsQuery.refetch();
            if (intent === 'edit_plan') void summaryQuery.refetch();
            if (intent === 'edit_event') void eventQuery.refetch();
          }}
          title="Journal form unavailable"
        />
      </JournalEntryModalFrame>
    );
  }

  if (intent === 'edit_plan' && !summaryQuery.data?.titleState.activePlan) {
    return (
      <ModalMessage
        message="This title has no active plan."
        onClose={closeModal}
        title="Plan not found"
      />
    );
  }

  if (intent === 'edit_event' && !eventQuery.data) {
    return (
      <ModalMessage
        message="This activity is no longer available."
        onClose={closeModal}
        title="Activity not found"
      />
    );
  }

  return (
    <JournalEntryModalFrame scroll title={copy.title} onClose={requestDismiss}>
      <JournalIntentForm
        errors={errors}
        event={eventQuery.data}
        intent={intent}
        isSubmitting={mutationPending}
        item={detailsQuery.data?.item}
        onChange={updateValue}
        onSubmit={submit}
        submitError={submitError}
        values={values}
      />
    </JournalEntryModalFrame>
  );
}
