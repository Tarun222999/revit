import { getJournalTitleActions } from '../features/journal/model/journalTitleActions';
import type { JournalTitleSummary } from '../features/journal/types';

function summary(
  status: JournalTitleSummary['titleState']['status'],
  options?: { activityCount?: number; plannedFor?: string | null },
): JournalTitleSummary {
  return {
    activityCount: options?.activityCount ?? 1,
    completedWatchCount: status === 'completed' ? 1 : 0,
    latestCompletedEvent: null,
    titleState: {
      activePlan:
        options && 'plannedFor' in options
          ? { plannedFor: options.plannedFor ?? null }
          : null,
      id: 'entry-1',
      mediaItemId: 'media-1',
      status,
      undatedCompletedCount: 0,
    },
  };
}

describe('Title Details Journal action matrix', () => {
  it('starts with media-specific actions outside the Journal', () => {
    expect(getJournalTitleActions('movie', null).primary.label).toBe('Log a watch');
    expect(getJournalTitleActions('series', null).primary.label).toBe('Start watching');
  });

  it('resolves an active plan from the planned-title source', () => {
    const actions = getJournalTitleActions(
      'movie',
      summary('completed', { plannedFor: '2026-08-10' }),
    );
    expect(actions.primary).toMatchObject({
      intent: 'log',
      label: 'Log as watched',
      source: 'planned_title',
    });
    expect(actions.secondary.label).toBe('Edit plan');
  });

  it('offers a rewatch and history for completed titles', () => {
    const actions = getJournalTitleActions('movie', summary('completed'));
    expect(actions.primary.label).toBe('Log a rewatch');
    expect(actions.secondary).toEqual({ intent: 'history', label: 'View history' });
    expect(actions.planAction?.label).toBe('Plan a rewatch');
  });

  it('offers resume without hiding plan-again for stopped titles', () => {
    const actions = getJournalTitleActions('anime', summary('dropped'));
    expect(actions.primary.intent).toBe('resume');
    expect(actions.planAction?.label).toBe('Plan again');
  });
});
