import type { MediaType } from '@/constants/media';
import type {
  JournalFormIntent,
  JournalTitleSummary,
} from '@/features/journal/types';

export type JournalTitleAction = {
  disabled?: boolean;
  disabledReason?: string;
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

function isGame(mediaType: MediaType) {
  return mediaType === 'game';
}

export function getJournalTitleActions(
  mediaType: MediaType,
  summary: JournalTitleSummary | null,
): JournalTitleActionModel {
  const movie = isMovie(mediaType);
  const game = isGame(mediaType);
  if (!summary) {
    return {
      planAction: movie
        ? null
        : {
            intent: 'plan',
            label: game ? 'Plan to play' : 'Plan to watch',
            source: 'title',
          },
      primary: {
        intent: movie ? 'log' : 'start',
        label: movie
          ? 'Log a watch'
          : game
            ? 'Start playing'
            : 'Start watching',
        source: 'title',
      },
      secondary: movie
        ? { intent: 'plan', label: 'Plan to watch', source: 'title' }
        : {
            intent: 'log_finished',
            label: game ? 'Already played? Log as finished' : 'Log as finished',
            source: 'title',
          },
      stopAction: null,
    };
  }

  if (summary.titleState.activePlan) {
    return {
      planAction: null,
      primary: {
        intent: movie ? 'log' : 'start',
        label: movie
          ? 'Log as watched'
          : game
            ? 'Start playing'
            : 'Start watching',
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
        label: movie
          ? 'Log a rewatch'
          : game
            ? 'Play again'
            : 'Start a rewatch',
        source: 'title',
      },
      secondary: game
        ? {
            intent: 'edit_event',
            label: 'Edit completed play',
            source: 'title',
          }
        : { intent: 'plan', label: 'Plan a rewatch', source: 'title' },
      stopAction: null,
    };
  }

  if (summary.titleState.status === 'dropped') {
    return {
      planAction: null,
      primary: {
        intent: 'resume',
        label: game ? 'Resume playing' : 'Resume watching',
        source: 'title',
      },
      secondary: { intent: 'plan', label: 'Plan again', source: 'title' },
      stopAction: null,
    };
  }

  return {
    planAction: null,
    primary: {
      disabled: game,
      disabledReason: game
        ? 'Playing updates arrive with the Games Journal flow.'
        : undefined,
      intent: game ? 'resume' : 'finish',
      label: movie ? 'Mark watched' : game ? 'Update playing' : 'Mark finished',
      source: 'title',
    },
    secondary: game
      ? { intent: 'finish', label: 'Finish playing', source: 'title' }
      : { intent: 'stop', label: 'Stop watching', source: 'title' },
    stopAction: null,
  };
}
