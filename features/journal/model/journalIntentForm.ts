import { REVIEW_BODY_MAX_LENGTH } from '@/constants/reviews';
import type {
  JournalEvent,
  JournalFormIntent,
  JournalIntentFormErrors,
  JournalIntentFormValues,
  JournalLifecycleIntent,
} from '@/features/journal/types';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const JOURNAL_INTENT_COPY: Record<
  JournalFormIntent,
  {
    dateLabel: string;
    description: string;
    submitLabel: string;
    title: string;
  }
> = {
  edit_event: {
    dateLabel: 'Date',
    description: 'Update only this item in your history.',
    submitLabel: 'Save changes',
    title: 'Edit activity',
  },
  edit_plan: {
    dateLabel: 'Planned for',
    description: 'Change the date or leave it open for Someday.',
    submitLabel: 'Save plan',
    title: 'Edit plan',
  },
  finish: {
    dateLabel: 'Finished on',
    description: 'Add the finish to your history.',
    submitLabel: 'Mark finished',
    title: 'Finish watching',
  },
  log: {
    dateLabel: 'Watched on',
    description: 'Record when you watched it.',
    submitLabel: 'Log watch',
    title: 'Log a watch',
  },
  log_finished: {
    dateLabel: 'Finished on',
    description: 'Record when you finished it.',
    submitLabel: 'Log as finished',
    title: 'Log as finished',
  },
  plan: {
    dateLabel: 'Planned for',
    description: 'Choose a date or leave it open for Someday.',
    submitLabel: 'Save plan',
    title: 'Plan to watch',
  },
  previous_watch: {
    dateLabel: 'Watched on',
    description: 'Add an earlier watch without changing a future plan.',
    submitLabel: 'Add previous watch',
    title: 'Add previous watch',
  },
  resume: {
    dateLabel: 'Resumed on',
    description: 'Add a fresh start without erasing the earlier stop.',
    submitLabel: 'Resume watching',
    title: 'Resume watching',
  },
  rewatch: {
    dateLabel: 'Rewatched on',
    description: 'Add a new watch while keeping the earlier ones.',
    submitLabel: 'Log rewatch',
    title: 'Log a rewatch',
  },
  start: {
    dateLabel: 'Started on',
    description: 'Record when you started watching.',
    submitLabel: 'Start watching',
    title: 'Start watching',
  },
  stop: {
    dateLabel: 'Stopped on',
    description: 'Record when you stopped. You can resume later.',
    submitLabel: 'Stop watching',
    title: 'Stop watching',
  },
};

export function isJournalFormIntent(value?: string): value is JournalFormIntent {
  return Boolean(
    value && Object.prototype.hasOwnProperty.call(JOURNAL_INTENT_COPY, value),
  );
}

export function localToday(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isPlanningIntent(intent: JournalFormIntent) {
  return intent === 'plan' || intent === 'edit_plan';
}

export function isCompletedIntent(intent: JournalFormIntent) {
  return (
    intent === 'finish' ||
    intent === 'log' ||
    intent === 'log_finished' ||
    intent === 'previous_watch' ||
    intent === 'rewatch'
  );
}

export function allowsRating(intent: JournalFormIntent, event?: JournalEvent) {
  return isCompletedIntent(intent) || (intent === 'edit_event' && event?.type === 'completed');
}

export function createJournalIntentFormValues(
  intent: JournalFormIntent,
  options?: { event?: JournalEvent | null; plannedFor?: string | null },
): JournalIntentFormValues {
  if (intent === 'edit_event' && options?.event) {
    return {
      date: options.event.eventDate,
      notes: options.event.notes ?? '',
      rating: options.event.rating,
    };
  }

  if (intent === 'edit_plan') {
    return { date: options?.plannedFor ?? null, notes: '', rating: null };
  }

  return {
    date: isPlanningIntent(intent) ? null : localToday(),
    notes: '',
    rating: null,
  };
}

function isRealDate(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateJournalIntentForm(
  intent: JournalFormIntent,
  values: JournalIntentFormValues,
  today = localToday(),
): JournalIntentFormErrors {
  const errors: JournalIntentFormErrors = {};

  if (!isPlanningIntent(intent) && !values.date) {
    errors.date = 'Choose a date.';
  } else if (values.date && !isRealDate(values.date)) {
    errors.date = 'Choose a valid date.';
  } else if (values.date && isPlanningIntent(intent) && values.date < today) {
    errors.date = 'A new plan cannot be in the past.';
  } else if (values.date && !isPlanningIntent(intent) && values.date > today) {
    errors.date = 'Journal activity cannot be in the future.';
  }

  if (values.notes.length > REVIEW_BODY_MAX_LENGTH) {
    errors.notes = `Notes must be ${REVIEW_BODY_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}

export function hasJournalIntentFormErrors(errors: JournalIntentFormErrors) {
  return Object.keys(errors).length > 0;
}

export function hasJournalIntentFormChanged(
  initial: JournalIntentFormValues,
  current: JournalIntentFormValues,
) {
  return (
    initial.date !== current.date ||
    initial.notes !== current.notes ||
    initial.rating !== current.rating
  );
}

export function lifecycleIntentForForm(
  intent: JournalFormIntent,
): JournalLifecycleIntent {
  switch (intent) {
    case 'finish':
    case 'log':
    case 'log_finished':
      return 'complete';
    case 'previous_watch':
    case 'resume':
    case 'rewatch':
    case 'start':
    case 'stop':
      return intent;
    default:
      throw new Error(`${intent} does not create a Journal event.`);
  }
}

export function createJournalRequestId() {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
