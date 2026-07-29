import type {
  JournalFormIntent,
  JournalPlannerItem,
} from '@/features/journal/types';

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
