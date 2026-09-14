import { REVIEW_BODY_MAX_LENGTH } from '@/constants/reviews';
import type {
  JournalEvent,
  JournalFormIntent,
  JournalIntentFormErrors,
  JournalIntentFormValues,
  JournalLifecycleIntent,
} from '@/features/journal/types';
import type { MediaType } from '@/constants/media';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    submitLabel: 'Log another watch',
    title: 'Log another watch',
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

/** Keeps the event schema neutral while making the existing form language media-aware. */
export function getJournalIntentCopy(intent: JournalFormIntent, mediaType?: MediaType) {
  const copy = JOURNAL_INTENT_COPY[intent];
  if (mediaType !== 'game') return copy;

  const replacements: Record<JournalFormIntent, Partial<typeof copy>> = {
    edit_event: { description: 'Update only this item in your play history.', title: 'Edit play' },
    edit_plan: { title: 'Edit plan to play' },
    finish: { description: 'Add this finish to your play history.', submitLabel: 'Finish playing', title: 'Finish playing' },
    log: { dateLabel: 'Played on', description: 'Record when you played it.', submitLabel: 'Log play', title: 'Log a play' },
    log_finished: { description: 'Record when you finished playing.', submitLabel: 'Log as finished', title: 'Log as finished' },
    plan: { description: 'Choose a date or leave it open for Someday.', submitLabel: 'Save plan', title: 'Plan to play' },
    previous_watch: { dateLabel: 'Played on', description: 'Add an earlier play without changing a future plan.', submitLabel: 'Log another play', title: 'Log another play' },
    resume: { description: 'Add a fresh start without erasing the earlier stop.', submitLabel: 'Resume playing', title: 'Resume playing' },
    rewatch: { dateLabel: 'Played on', description: 'Add a new play while keeping the earlier ones.', submitLabel: 'Play again', title: 'Play again' },
    start: { description: 'Record when you started playing.', submitLabel: 'Start playing', title: 'Start playing' },
    stop: { description: 'Record when you stopped. You can resume later.', submitLabel: 'Stop playing', title: 'Stop playing' },
  };
  return { ...copy, ...replacements[intent] };
}

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

export function isFutureReleaseDate(
  releaseDate?: string | null,
  today = localToday(),
) {
  if (!releaseDate || !ISO_DATE_INPUT_PATTERN.test(releaseDate)) return false;
  return releaseDate > today;
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

export function allowsRating(
  intent: JournalFormIntent,
  event?: JournalEvent,
  mediaType?: MediaType,
) {
  return isCompletedIntent(intent) ||
    (intent === 'edit_event' &&
      (event?.type === 'completed' ||
        (event?.type === 'started' && mediaType === 'game')));
}

export function createJournalIntentFormValues(
  intent: JournalFormIntent,
  options?: { event?: JournalEvent | null; plannedFor?: string | null },
): JournalIntentFormValues {
  if (intent === 'edit_event' && options?.event) {
    return {
      date: options.event.eventDate,
      notes: options.event.notes ?? '',
      playedOnPlatform: options.event.playedOnPlatform ?? '',
      rating: options.event.rating,
    };
  }

  if (intent === 'edit_plan') {
    return { date: options?.plannedFor ?? null, notes: '', playedOnPlatform: '', rating: null };
  }

  return {
    date: isPlanningIntent(intent) ? null : localToday(),
    notes: '',
    playedOnPlatform: '',
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
    (initial.playedOnPlatform ?? '') !== (current.playedOnPlatform ?? '') ||
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
