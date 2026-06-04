export const JOURNAL_STATUSES = ['planned', 'in_progress', 'completed', 'dropped'] as const;

export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const JOURNAL_DEFAULT_STATUS: JournalStatus = 'planned';

export const JOURNAL_STATUS_LABELS: Record<JournalStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  dropped: 'Dropped',
};

export const JOURNAL_STATUS_OPTIONS = JOURNAL_STATUSES.map((value) => ({
  label: JOURNAL_STATUS_LABELS[value],
  value,
}));

export function isJournalStatus(value: string): value is JournalStatus {
  return JOURNAL_STATUSES.includes(value as JournalStatus);
}
