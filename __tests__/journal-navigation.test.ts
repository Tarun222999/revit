import {
  getJournalFastCapture,
  resolveJournalCaptureAction,
} from '../features/journal/model/journalNavigation';
import type { JournalTitleSummary } from '../features/journal/types';

const plannedSummary: JournalTitleSummary = {
  activityCount: 0,
  completedWatchCount: 0,
  latestCompletedEvent: null,
  titleState: {
    activePlan: { plannedFor: '2026-08-01' },
    id: 'entry-1',
    mediaItemId: 'media-1',
    status: 'planned',
  },
};

describe('Journal fast capture navigation', () => {
  it('uses Log in Timeline and Calendar and Add plan in Planner', () => {
    expect(getJournalFastCapture('timeline')).toEqual({ capture: 'log', label: 'Log' });
    expect(getJournalFastCapture('calendar')).toEqual({ capture: 'log', label: 'Log' });
    expect(getJournalFastCapture('planner')).toEqual({ capture: 'plan', label: 'Add plan' });
  });

  it('resolves Log to the media- and state-specific title action', () => {
    expect(resolveJournalCaptureAction('log', 'movie', null).intent).toBe('log');
    expect(resolveJournalCaptureAction('log', 'series', null).intent).toBe('start');
    expect(resolveJournalCaptureAction('log', 'movie', plannedSummary).source).toBe(
      'planned_title',
    );
  });

  it('edits an existing plan instead of creating a duplicate', () => {
    expect(resolveJournalCaptureAction('plan', 'movie', plannedSummary).intent).toBe(
      'edit_plan',
    );
    expect(resolveJournalCaptureAction('plan', 'movie', null).intent).toBe('plan');
  });
});
