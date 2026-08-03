import type {
  JournalFormIntent,
  JournalPlannerItem,
  JournalPlannerSection,
} from '@/features/journal/types';

export type PlannerManagementAction = {
  id: 'edit_plan' | 'move_to_someday' | 'remove_plan';
  label: string;
};

export function getPlannerManagementActions(
  section: JournalPlannerSection,
): PlannerManagementAction[] {
  if (section === 'someday') {
    return [
      { id: 'edit_plan', label: 'Schedule' },
      { id: 'remove_plan', label: 'Remove plan' },
    ];
  }

  return [
    { id: 'edit_plan', label: 'Reschedule' },
    { id: 'move_to_someday', label: 'Move to Someday' },
    { id: 'remove_plan', label: 'Remove plan' },
  ];
}

export function getPlannerWatchAction(
  item: JournalPlannerItem,
): { intent: JournalFormIntent; label: string } {
  if (item.media.mediaType === 'movie') {
    return item.titleState.status === 'completed'
      ? { intent: 'rewatch', label: 'Log rewatch' }
      : { intent: 'log', label: 'Log watch' };
  }
  return item.titleState.status === 'completed'
    ? { intent: 'start', label: 'Start rewatch' }
    : { intent: 'start', label: 'Start watching' };
}
