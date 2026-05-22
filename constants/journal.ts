export const JOURNAL_STATUSES = ['planned', 'in_progress', 'completed', 'dropped'] as const;

export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  dropped: 'Dropped',
};
