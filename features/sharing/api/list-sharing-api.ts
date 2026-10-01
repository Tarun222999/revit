import { supabase } from '@/lib/supabase/client';
import { withRequestTimeout } from '@/lib/query/requestTimeout';
import type {
  ListSharingState,
  ManageListSharingInput,
  SharedListPage,
} from '@/types/sharedList';

export class SharedListUnavailableError extends Error {
  constructor() {
    super('This list link is unavailable.');
    this.name = 'SharedListUnavailableError';
  }
}

async function invoke<T>(name: string, body: object): Promise<T> {
  const controller = new AbortController();
  const { data, error } = await withRequestTimeout(
    supabase.functions.invoke<T>(name, { body, signal: controller.signal }),
    'Sharing took too long. Check your connection and try again.',
    10_000,
    () => controller.abort(),
  );
  if (error) {
    const status = (error as { context?: Response }).context?.status;
    if (status === 404) throw new SharedListUnavailableError();
    if (status === 409)
      throw new Error('Sharing changed. Reload and try again.');
    // Do not propagate errors that may contain request payloads or share keys.
    throw new Error(
      'Unable to load sharing right now. Check your connection and try again.',
    );
  }
  if (!data) throw new Error('Unable to load sharing right now.');
  return data;
}

export const manageListSharing = (input: ManageListSharingInput) =>
  invoke<ListSharingState>('list-sharing', input);
export const getSharedList = (key: string, cursor: string | null) =>
  invoke<SharedListPage>('shared-list', { key, cursor });
