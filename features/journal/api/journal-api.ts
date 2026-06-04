import { isJournalStatus } from '@/constants/journal';
import { supabase } from '@/lib/supabase/client';
import type {
  CreateJournalEntryInput,
  JournalEntry,
  JournalEntryFormValues,
  JournalEntryInsert,
  JournalEntryRow,
  JournalEntryUpdate,
  UpdateJournalEntryInput,
} from '@/features/journal/types';

function toJournalEntry(row: JournalEntryRow): JournalEntry {
  if (!isJournalStatus(row.status)) {
    throw new Error(`Unsupported journal status: ${row.status}`);
  }

  return {
    ...row,
    status: row.status,
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function toJournalEntryFields(
  values: JournalEntryFormValues,
): Pick<
  JournalEntryInsert,
  | 'completed_on'
  | 'contains_spoilers'
  | 'rating'
  | 'review_body'
  | 'review_headline'
  | 'status'
> {
  return {
    completed_on: values.status === 'completed' ? values.completedOn : null,
    contains_spoilers: values.containsSpoilers,
    rating: values.rating,
    review_body: normalizeOptionalText(values.reviewBody),
    review_headline: normalizeOptionalText(values.reviewHeadline),
    status: values.status,
  };
}

export async function getJournalEntryForMedia({
  mediaItemId,
  userId,
}: {
  mediaItemId: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('media_item_id', mediaItemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toJournalEntry(data) : null;
}

export async function createJournalEntry(input: CreateJournalEntryInput) {
  const entry: JournalEntryInsert = {
    ...toJournalEntryFields(input),
    media_item_id: input.mediaItemId,
    user_id: input.userId,
  };

  const { data, error } = await supabase
    .from('journal_entries')
    .insert(entry)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toJournalEntry(data);
}

export async function updateJournalEntry(input: UpdateJournalEntryInput) {
  const entry: JournalEntryUpdate = toJournalEntryFields(input);

  const { data, error } = await supabase
    .from('journal_entries')
    .update(entry)
    .eq('id', input.entryId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toJournalEntry(data);
}

export async function deleteJournalEntry(entryId: string) {
  const { data, error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toJournalEntry(data);
}
