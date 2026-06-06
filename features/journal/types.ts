import type { JournalStatus } from '@/constants/journal';
import type { MediaType } from '@/constants/media';
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/supabase/types';
import type { MediaSource } from '@/types/media';

export type JournalEntryRow = Tables<'journal_entries'>;
export type JournalEntryInsert = TablesInsert<'journal_entries'>;
export type JournalEntryUpdate = TablesUpdate<'journal_entries'>;
export type MediaItemRow = Tables<'media_items'>;

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

export type JournalListEntryRow = JournalEntryRow & {
  media_items: MediaItemRow | null;
};

export type JournalListEntry = {
  id: string;
  mediaItemId: string;
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  description: string | null;
  releaseDate: string | null;
  year: string | null;
  imageUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
  status: JournalStatus;
  rating: number | null;
  reviewHeadline: string | null;
  reviewBody: string | null;
  containsSpoilers: boolean;
  completedOn: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
};
