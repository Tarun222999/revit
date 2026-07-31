import { getJournalPlannerSection } from '../features/journal/model/journalReadModels';
import { getPlannerWatchAction } from '../features/journal/model/journalPlanner';
import type { JournalPlannerItem } from '../features/journal/types';

function item(status: JournalPlannerItem['titleState']['status'], mediaType: 'movie' | 'series'): JournalPlannerItem {
  return {
    media: {
      id: 'media-1',
      imageUrl: null,
      mediaType,
      originalTitle: null,
      releaseDate: null,
      source: 'tmdb',
      sourceId: '1',
      title: 'Title',
      year: null,
    },
    section: 'upcoming',
    titleState: {
      activePlan: { plannedFor: '2026-08-01' },
      id: 'entry-1',
      mediaItemId: 'media-1',
      status,
      undatedCompletedCount: 0,
    },
  };
}

describe('Planner actions and sections', () => {
  it('classifies plans into exactly one local-day section', () => {
    expect(getJournalPlannerSection('2026-07-29', '2026-07-29')).toBe('today');
    expect(getJournalPlannerSection('2026-07-30', '2026-07-29')).toBe('upcoming');
    expect(getJournalPlannerSection('2026-07-28', '2026-07-29')).toBe('missed');
    expect(getJournalPlannerSection(null, '2026-07-29')).toBe('someday');
  });

  it('logs completed planned movies as rewatches', () => {
    expect(getPlannerWatchAction(item('completed', 'movie'))).toEqual({
      intent: 'rewatch',
      label: 'Log rewatch',
    });
  });

  it('starts series plans without adding episode tracking', () => {
    expect(getPlannerWatchAction(item('planned', 'series'))).toEqual({
      intent: 'start',
      label: 'Start watching',
    });
  });
});
