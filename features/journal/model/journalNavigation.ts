import type { MediaType } from '@/constants/media';
import { getJournalTitleActions, type JournalTitleAction } from '@/features/journal/model/journalTitleActions';
import type { JournalTitleSummary } from '@/features/journal/types';

export type JournalNavigationView = 'timeline' | 'planner' | 'calendar';
export type JournalCaptureIntent = 'log' | 'plan';

export function getJournalFastCapture(view: JournalNavigationView) {
  return view === 'planner'
    ? { capture: 'plan' as const, label: 'Add plan' }
    : { capture: 'log' as const, label: 'Log' };
}

export function resolveJournalCaptureAction(
  capture: JournalCaptureIntent,
  mediaType: MediaType,
  summary: JournalTitleSummary | null,
): JournalTitleAction {
  if (capture === 'plan') {
    return {
      intent: summary?.titleState.activePlan ? 'edit_plan' : 'plan',
      label: summary?.titleState.activePlan ? 'Edit plan' : 'Plan to watch',
      source: 'title',
    };
  }

  return getJournalTitleActions(mediaType, summary).primary;
}
