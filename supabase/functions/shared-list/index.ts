import { createServiceClient, requireAuth } from '../_shared/auth.ts';
import { getAppCapabilities } from '../_shared/app-capabilities.ts';
import { createSharedListHandler } from '../_shared/list-sharing-handler.ts';
import { createListShareCursor } from '../_shared/list-share-cursor.ts';
import { createPublicTitleRequestThrottle } from '../_shared/public-title-throttle.ts';
import type { SharedListPage } from '../../../types/sharedList.ts';

Deno.serve(
  createSharedListHandler({
    allowRequest: createPublicTitleRequestThrottle(),
    // Anonymous requests carry an anon API token. Only getUser can establish ownership.
    viewer: async (request) => {
      try {
        return (await requireAuth(request)).userId;
      } catch {
        return null;
      }
    },
    resolve: async (key, cursor, viewerId) => {
      const secret = Deno.env.get('LIST_SHARE_CURSOR_SECRET');
      if (!secret) throw new Error('List cursor configuration is missing.');
      const cursors = createListShareCursor(secret);
      const offset = await cursors.decode(key, cursor);
      const { data, error } = await createServiceClient().rpc(
        'resolve_shared_list',
        {
          p_key: key,
          p_viewer_id: viewerId,
          p_offset: offset,
          p_games_enabled: getAppCapabilities().gamesEnabled,
        },
      );
      if (error) throw new Error('Shared list lookup failed.');
      if (!data) return null;
      const { nextOffset, ...page } = data as Omit<
        SharedListPage,
        'nextCursor'
      > & { nextOffset: number | null };
      return {
        ...page,
        nextCursor:
          nextOffset === null ? null : await cursors.encode(key, nextOffset),
      } as SharedListPage;
    },
  }),
);
