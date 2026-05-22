import type { JournalStatus } from '@/constants/journal';

export type JournalEntry = {
  id: string;
  userId: string;
  mediaItemId: string;
  status: JournalStatus;
  rating?: number | null;
  reviewHeadline?: string | null;
  reviewBody?: string | null;
  containsSpoilers: boolean;
  startedOn?: string | null;
  completedOn?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};
