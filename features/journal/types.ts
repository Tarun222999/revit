import type { JournalStatus } from '@/constants/journal';
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/supabase/types';

export type JournalEntryRow = Tables<'journal_entries'>;
export type JournalEntryInsert = TablesInsert<'journal_entries'>;
export type JournalEntryUpdate = TablesUpdate<'journal_entries'>;

export type JournalEntry = Omit<JournalEntryRow, 'status'> & {
  status: JournalStatus;
};

export type JournalEntryFormValues = {
  status: JournalStatus;
  rating: number | null;
  reviewHeadline: string;
  reviewBody: string;
  containsSpoilers: boolean;
  completedOn: string | null;
};

export type CreateJournalEntryInput = JournalEntryFormValues & {
  mediaItemId: string;
  userId: string;
};

export type UpdateJournalEntryInput = JournalEntryFormValues & {
  entryId: string;
};

export type DeleteJournalEntryInput = {
  entryId: string;
};

export type JournalEntryForMediaQuery = {
  mediaItemId: string;
  userId: string;
};
