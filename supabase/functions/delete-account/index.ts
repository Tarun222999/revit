import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from '../_shared/cors.ts';
import { createServiceClient, requireAuth } from '../_shared/auth.ts';

const AVATARS_BUCKET = 'avatars';

function getStorageObjectPath(name: unknown) {
  return typeof name === 'string' && name.length > 0 ? name : null;
}

Deno.serve(async (request) => {
  const optionsResponse = handleOptions(request);

  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    if (request.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed.');
    }

    const { userId } = await requireAuth(request);
    const supabase = createServiceClient();

    const { data: avatarObjects, error: listError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .list(userId, {
        limit: 100,
      });

    if (listError) {
      throw listError;
    }

    const avatarPaths = (avatarObjects ?? [])
      .map((object) => getStorageObjectPath(object.name))
      .filter((path): path is string => Boolean(path))
      .map((path) => `${userId}/${path}`);

    if (avatarPaths.length > 0) {
      const { error: removeAvatarError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .remove(avatarPaths);

      if (removeAvatarError) {
        throw removeAvatarError;
      }
    }

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
      userId,
    );

    if (deleteUserError) {
      throw deleteUserError;
    }

    return jsonResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
});
