import { JOURNAL_DEFAULT_STATUS } from '@/constants/journal';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_HEADLINE_MAX_LENGTH,
} from '@/constants/reviews';
import type { JournalEntry, JournalEntryFormValues } from '@/features/journal/types';

export type JournalEntryFormErrors = Partial<
  Record<keyof JournalEntryFormValues, string>
>;

export const defaultJournalEntryFormValues: JournalEntryFormValues = {
  completedOn: null,
  containsSpoilers: false,
  rating: null,
  reviewBody: '',
  reviewHeadline: '',
  status: JOURNAL_DEFAULT_STATUS,
};

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
}

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
