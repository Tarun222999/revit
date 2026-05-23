import { supabase } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/types';

export type Profile = Tables<'profiles'>;

export type CreateProfileInput = {
  userId: string;
  username: string;
  displayName: string;
  avatarPath?: string | null;
};

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return 'Choose a username.';
  }

  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
    return 'Use 3-24 lowercase letters, numbers, or underscores.';
  }

  return null;
}

export function validateDisplayName(displayName: string) {
  const normalized = displayName.trim();

  if (!normalized) {
    return 'Add a display name.';
  }

  if (normalized.length > 80) {
    return 'Display name must be 80 characters or fewer.';
  }

  return null;
}

export async function getCurrentProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createProfile({ userId, username, displayName, avatarPath = null }: CreateProfileInput) {
  const profile: TablesInsert<'profiles'> = {
    id: userId,
    username: normalizeUsername(username),
    display_name: displayName.trim(),
    avatar_path: avatarPath,
  };

  const { data, error } = await supabase.from('profiles').insert(profile).select().single();

  if (error) {
    throw error;
  }

  return data;
}
