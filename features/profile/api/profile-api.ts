import { supabase } from '@/lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/supabase/types';

export type Profile = Tables<'profiles'>;

export type CreateProfileInput = {
  userId: string;
  username: string;
  displayName: string;
  avatarPath?: string | null;
};

export type UpdateProfileInput = {
  userId: string;
  username: string;
  displayName: string;
  bio?: string | null;
};

export type UploadProfileAvatarInput = {
  userId: string;
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  file?: Blob | null;
  base64?: string | null;
};

export type DeleteAccountResult = {
  deleted: boolean;
};

const AVATARS_BUCKET = 'avatars';

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

function getAvatarExtension({
  fileName,
  mimeType,
}: {
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const extensionFromName = fileName?.split('.').pop()?.toLowerCase();

  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
    return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName;
  }

  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  if (mimeType === 'image/gif') {
    return 'gif';
  }

  return 'jpg';
}

async function getAvatarUploadBody(input: UploadProfileAvatarInput) {
  if (input.file) {
    return input.file;
  }

  if (input.base64) {
    return decodeBase64ToArrayBuffer(input.base64);
  }

  const response = await fetch(input.uri);

  if (!response.ok) {
    throw new Error('Could not read the selected avatar image.');
  }

  return response.blob();
}

function decodeBase64ToArrayBuffer(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export function getProfileAvatarUrl(avatarPath?: string | null, version?: string | null) {
  if (!avatarPath) {
    return null;
  }

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(avatarPath);

  if (!data.publicUrl) {
    return null;
  }

  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
}

export async function getCurrentProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function uploadProfileAvatar(input: UploadProfileAvatarInput) {
  const extension = getAvatarExtension(input);
  const avatarPath = `${input.userId}/avatar.${extension}`;
  const body = await getAvatarUploadBody(input);
  const contentType = input.mimeType ?? 'image/jpeg';
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(avatarPath, body, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return avatarPath;
}

export async function updateProfileAvatar({
  avatarPath,
  userId,
}: {
  avatarPath: string;
  userId: string;
}) {
  const profile: TablesUpdate<'profiles'> = {
    avatar_path: avatarPath,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfile({
  userId,
  username,
  displayName,
  bio,
}: UpdateProfileInput) {
  const profile: TablesUpdate<'profiles'> = {
    bio: bio?.trim() ? bio.trim() : null,
    display_name: displayName.trim(),
    username: normalizeUsername(username),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteAccount() {
  const { data, error } = await supabase.functions.invoke<DeleteAccountResult>(
    'delete-account',
  );

  if (error) {
    throw error;
  }

  if (!data?.deleted) {
    throw new Error('Could not delete account.');
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
