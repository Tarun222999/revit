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
    const movieActions = getJournalTitleActions('movie', null);
    const seriesActions = getJournalTitleActions('series', null);
    const animeActions = getJournalTitleActions('anime', null);

    expect(movieActions.primary.label).toBe('Log a watch');
    expect(movieActions.secondary).toMatchObject({
      intent: 'plan',
      label: 'Plan to watch',
    });
    expect(seriesActions.primary).toMatchObject({
      intent: 'start',
      label: 'Start watching',
      source: 'title',
    });
    expect(seriesActions.secondary).toMatchObject({
      intent: 'log_finished',
      label: 'Log as finished',
      source: 'title',
    });
    expect(seriesActions.planAction).toMatchObject({
      intent: 'plan',
      label: 'Plan to watch',
    });
    expect(animeActions.secondary).toMatchObject({ intent: 'log_finished' });
  });

  it('keeps Mark finished for a series already in progress', () => {
    expect(getJournalTitleActions('series', summary('in_progress')).primary).toMatchObject({
      intent: 'finish',
      label: 'Mark finished',
    });
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

  it('keeps history on the Your Journal strip for completed titles', () => {
    const actions = getJournalTitleActions('movie', summary('completed'));
    expect(actions.primary.label).toBe('Log a rewatch');
    expect(actions.secondary).toMatchObject({ intent: 'plan', label: 'Plan a rewatch' });
    expect(actions.planAction).toBeNull();
  });

  it('offers resume without hiding plan-again for stopped titles', () => {
    const actions = getJournalTitleActions('anime', summary('dropped'));
    expect(actions.primary.intent).toBe('resume');
    expect(actions.secondary).toMatchObject({ intent: 'plan', label: 'Plan again' });
    expect(actions.planAction).toBeNull();
  });
});
