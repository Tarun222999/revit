import {
  canRateOrReviewReleaseDate,
  clearRatingAndReviewValues,
  createDefaultJournalEntryFormValues,
  isFutureReleaseDate,
  todayString,
  validateJournalEntryForm,
  valuesForUnreleasedTitle,
} from '../features/journal/model/journalEntryForm';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_HEADLINE_MAX_LENGTH,
} from '../constants/reviews';

describe('journal entry form rules', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates completed defaults with today as the completion date', () => {
    expect(createDefaultJournalEntryFormValues()).toEqual({
      completedOn: '2026-07-13',
      containsSpoilers: false,
      rating: null,
      reviewBody: '',
      reviewHeadline: '',
      startedOn: null,
      status: 'completed',
    });
  });

  it('formats today as an ISO date', () => {
    expect(todayString()).toBe('2026-07-13');
  });

  it('only treats valid future ISO dates as unreleased', () => {
    expect(isFutureReleaseDate('2026-07-14')).toBe(true);
    expect(isFutureReleaseDate('2026-07-13')).toBe(false);
    expect(isFutureReleaseDate('not-a-date')).toBe(false);
    expect(isFutureReleaseDate(null)).toBe(false);
    expect(canRateOrReviewReleaseDate('2026-07-14')).toBe(false);
    expect(canRateOrReviewReleaseDate('2026-07-13')).toBe(true);
  });

  it('clears rating, review, and spoilers without changing the status or dates', () => {
    const values = {
      ...createDefaultJournalEntryFormValues(),
      containsSpoilers: true,
      rating: 4.5,
      reviewBody: 'A thoughtful review.',
      reviewHeadline: 'Worth watching',
      startedOn: '2026-07-01',
    };

    expect(clearRatingAndReviewValues(values)).toEqual({
      ...values,
      containsSpoilers: false,
      rating: null,
      reviewBody: '',
      reviewHeadline: '',
    });
  });

  it('turns an unreleased title into a planned entry and clears review values', () => {
    const values = {
      ...createDefaultJournalEntryFormValues(),
      containsSpoilers: true,
      rating: 4,
      reviewBody: 'Not available yet.',
      reviewHeadline: 'Coming soon',
      startedOn: '2026-07-20',
    };

    expect(valuesForUnreleasedTitle(values)).toEqual({
      ...values,
      completedOn: null,
      containsSpoilers: false,
      rating: null,
      reviewBody: '',
      reviewHeadline: '',
      status: 'planned',
    });
  });

  it('returns no errors for valid form values', () => {
    expect(
      validateJournalEntryForm({
        ...createDefaultJournalEntryFormValues(),
        completedOn: '2024-02-29',
        reviewBody: 'A short review.',
        reviewHeadline: 'Great',
        startedOn: '2024-02-01',
      }),
    ).toEqual({});
  });

  it('rejects reviews longer than their configured limits', () => {
    expect(
      validateJournalEntryForm({
        ...createDefaultJournalEntryFormValues(),
        reviewBody: 'b'.repeat(REVIEW_BODY_MAX_LENGTH + 1),
        reviewHeadline: 'h'.repeat(REVIEW_HEADLINE_MAX_LENGTH + 1),
      }),
    ).toEqual({
      reviewBody: `Review must be ${REVIEW_BODY_MAX_LENGTH} characters or fewer.`,
      reviewHeadline: `Headline must be ${REVIEW_HEADLINE_MAX_LENGTH} characters or fewer.`,
    });
  });

  it('rejects impossible completed dates', () => {
    expect(
      validateJournalEntryForm({
        ...createDefaultJournalEntryFormValues(),
        completedOn: '2026-02-31',
      }),
    ).toEqual({ completedOn: 'Use YYYY-MM-DD.' });
  });

  it('rejects invalid started dates', () => {
    expect(
      validateJournalEntryForm({
        ...createDefaultJournalEntryFormValues(),
        startedOn: '2026-13-01',
      }),
    ).toEqual({ startedOn: 'Use YYYY-MM-DD.' });
  });
});
