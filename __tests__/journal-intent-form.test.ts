import {
  allowsRating,
  createJournalIntentFormValues,
  createJournalRequestId,
  hasJournalIntentFormChanged,
  isJournalFormIntent,
  lifecycleIntentForForm,
  localToday,
  validateJournalIntentForm,
} from '../features/journal/model/journalIntentForm';
import type { JournalEvent } from '../features/journal/types';

const completedEvent: JournalEvent = {
  eventDate: '2026-07-20',
  id: 'event-1',
  journalEntryId: 'entry-1',
  notes: 'Original note',
  rating: 4,
  type: 'completed',
};

describe('intent-based Journal form', () => {
  it('uses the device-local calendar day instead of UTC', () => {
    expect(localToday(new Date(2026, 6, 29, 0, 15))).toBe('2026-07-29');
  });

  it('starts plans in Someday and activity on the local day', () => {
    expect(createJournalIntentFormValues('plan').date).toBeNull();
    expect(createJournalIntentFormValues('log').date).toBe(localToday());
  });

  it('hydrates one selected event without merging another watch', () => {
    expect(
      createJournalIntentFormValues('edit_event', { event: completedEvent }),
    ).toEqual({ date: '2026-07-20', notes: 'Original note', rating: 4 });
  });

  it('enforces plan and activity date boundaries', () => {
    expect(
      validateJournalIntentForm(
        'plan',
        { date: '2026-07-28', notes: '', rating: null },
        '2026-07-29',
      ),
    ).toEqual({ date: 'A new plan cannot be in the past.' });
    expect(
      validateJournalIntentForm(
        'log',
        { date: '2026-07-30', notes: '', rating: null },
        '2026-07-29',
      ),
    ).toEqual({ date: 'Journal activity cannot be in the future.' });
  });

  it('keeps missing provider metadata out of validation', () => {
    expect(
      validateJournalIntentForm(
        'log',
        { date: '2026-07-20', notes: 'Festival screening', rating: 4.5 },
        '2026-07-29',
      ),
    ).toEqual({});
  });

  it('detects dirty edits and exposes rating only for completions', () => {
    const initial = { date: '2026-07-20', notes: '', rating: null };
    expect(hasJournalIntentFormChanged(initial, initial)).toBe(false);
    expect(hasJournalIntentFormChanged(initial, { ...initial, notes: 'New' })).toBe(true);
    expect(allowsRating('stop')).toBe(false);
    expect(allowsRating('edit_event', completedEvent)).toBe(true);
  });

  it('maps form actions to lifecycle operations and creates valid request ids', () => {
    expect(lifecycleIntentForForm('finish')).toBe('complete');
    expect(lifecycleIntentForForm('rewatch')).toBe('rewatch');
    expect(isJournalFormIntent('previous_watch')).toBe(true);
    expect(createJournalRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
