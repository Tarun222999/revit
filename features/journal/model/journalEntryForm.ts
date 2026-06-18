import { JOURNAL_DEFAULT_STATUS } from '@/constants/journal';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_HEADLINE_MAX_LENGTH,
} from '@/constants/reviews';
import type { JournalEntry, JournalEntryFormValues } from '@/features/journal/types';

export type JournalEntryFormErrors = Partial<
  Record<keyof JournalEntryFormValues, string>
>;

const ISO_DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_LENGTH = 10;
const UTC_DATE_START_TIME = 'T00:00:00.000Z';

/**
 * Formats the current day for date inputs.
 *
 * @returns Today's date as `YYYY-MM-DD`.
 */
export function todayString() {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH);
}

export function isFutureReleaseDate(releaseDate?: string | null) {
  if (!releaseDate || !ISO_DATE_INPUT_PATTERN.test(releaseDate)) {
    return false;
  }

  return releaseDate > todayString();
}

export function canRateOrReviewReleaseDate(releaseDate?: string | null) {
  return !isFutureReleaseDate(releaseDate);
}

export function clearRatingAndReviewValues(
  values: JournalEntryFormValues,
): JournalEntryFormValues {
  return {
    ...values,
    containsSpoilers: false,
    rating: null,
    reviewBody: '',
    reviewHeadline: '',
  };
}

/**
 * Creates a fresh set of default values for the journal entry form.
 *
 * @returns Default form values aligned with the configured default status.
 */
export function createDefaultJournalEntryFormValues(): JournalEntryFormValues {
  return {
    completedOn:
      JOURNAL_DEFAULT_STATUS === 'completed' ? todayString() : null,
    containsSpoilers: false,
    rating: null,
    reviewBody: '',
    reviewHeadline: '',
    status: JOURNAL_DEFAULT_STATUS,
  };
}

/**
 * Converts a persisted journal entry into editable form values.
 *
 * @param entry - Existing journal entry returned by the data layer.
 * @returns Form values with nullable review fields normalized to empty text.
 */
export function valuesFromJournalEntry(
  entry: JournalEntry,
): JournalEntryFormValues {
  return {
    completedOn: entry.completed_on,
    containsSpoilers: entry.contains_spoilers,
    rating: entry.rating,
    reviewBody: entry.review_body ?? '',
    reviewHeadline: entry.review_headline ?? '',
    status: entry.status,
  };
}

function isValidDateInput(value: string) {
  if (!ISO_DATE_INPUT_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}${UTC_DATE_START_TIME}`);

  // Reject impossible dates like 2026-02-31 after JavaScript normalizes them.
  return (
    !Number.isNaN(date.getTime()) &&
    value === date.toISOString().slice(0, ISO_DATE_LENGTH)
  );
}

/**
 * Validates journal entry form values before create/update mutations run.
 *
 * @param values - Current controlled form values.
 * @returns Field-level validation errors keyed by form value name.
 */
export function validateJournalEntryForm(
  values: JournalEntryFormValues,
): JournalEntryFormErrors {
  const errors: JournalEntryFormErrors = {};

  if (values.reviewHeadline.length > REVIEW_HEADLINE_MAX_LENGTH) {
    errors.reviewHeadline = `Headline must be ${REVIEW_HEADLINE_MAX_LENGTH} characters or fewer.`;
  }

  if (values.reviewBody.length > REVIEW_BODY_MAX_LENGTH) {
    errors.reviewBody = `Review must be ${REVIEW_BODY_MAX_LENGTH} characters or fewer.`;
  }

  if (
    values.status === 'completed' &&
    values.completedOn &&
    !isValidDateInput(values.completedOn)
  ) {
    errors.completedOn = 'Use YYYY-MM-DD.';
  }

  return errors;
}
