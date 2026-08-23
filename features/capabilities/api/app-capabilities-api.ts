import { supabase } from '@/lib/supabase/client';

import type { AppCapabilities } from '../types';

export const APP_CAPABILITIES_TIMEOUT_MS = 10 * 1000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('The app capability request timed out.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getAppCapabilities(): Promise<AppCapabilities> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke<unknown>('app-capabilities', { body: {} }),
    APP_CAPABILITIES_TIMEOUT_MS,
  );

  if (error) {
    throw error;
  }

  if (
    !data ||
    typeof data !== 'object' ||
    typeof (data as { gamesEnabled?: unknown }).gamesEnabled !== 'boolean'
  ) {
    throw new Error('The app capability response was invalid.');
  }

  return {
    gamesEnabled: (data as { gamesEnabled: boolean }).gamesEnabled,
  };
}
