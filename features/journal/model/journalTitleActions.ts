import type { MediaType } from '@/constants/media';
import type { JournalFormIntent, JournalTitleSummary } from '@/features/journal/types';

export type JournalTitleAction = {
  intent: JournalFormIntent;
  label: string;
  source: 'planned_title' | 'title';
};

export type JournalTitleActionModel = {
  primary: JournalTitleAction;
  secondary: JournalTitleAction;
  planAction: JournalTitleAction | null;
  stopAction: JournalTitleAction | null;
};

function isMovie(mediaType: MediaType) {
  return mediaType === 'movie';
}

export function getJournalTitleActions(
  mediaType: MediaType,
  summary: JournalTitleSummary | null,
): JournalTitleActionModel {
  const movie = isMovie(mediaType);
  if (!summary) {
    return {
      planAction: movie
        ? null
        : { intent: 'plan', label: 'Plan to watch', source: 'title' },
      primary: {
        intent: movie ? 'log' : 'start',
        label: movie ? 'Log a watch' : 'Start watching',
        source: 'title',
      },
      secondary: movie
        ? { intent: 'plan', label: 'Plan to watch', source: 'title' }
        : { intent: 'log_finished', label: 'Log as finished', source: 'title' },
      stopAction: null,
    };
  }

  if (summary.titleState.activePlan) {
    return {
      planAction: null,
      primary: {
        intent: movie ? 'log' : 'start',
        label: movie ? 'Log as watched' : 'Start watching',
        source: 'planned_title',
      },
      secondary: { intent: 'edit_plan', label: 'Edit plan', source: 'title' },
      stopAction: null,
    };
  }

  if (summary.titleState.status === 'completed') {
    return {
      planAction: null,
      primary: {
        intent: movie ? 'rewatch' : 'start',
        label: movie ? 'Log a rewatch' : 'Start a rewatch',
        source: 'title',
      },
      secondary: { intent: 'plan', label: 'Plan a rewatch', source: 'title' },
      stopAction: null,
    };
  }

  if (summary.titleState.status === 'dropped') {
    return {
      planAction: null,
      primary: { intent: 'resume', label: 'Resume watching', source: 'title' },
      secondary: { intent: 'plan', label: 'Plan again', source: 'title' },
      stopAction: null,
    };
  }

  return {
    planAction: null,
    primary: {
      intent: 'finish',
      label: movie ? 'Mark watched' : 'Mark finished',
      source: 'title',
    },
    secondary: { intent: 'stop', label: 'Stop watching', source: 'title' },
    stopAction: null,
  };
}
