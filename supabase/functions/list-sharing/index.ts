import { createServiceClient, requireAuth } from '../_shared/auth.ts';
import { createManageListSharingHandler } from '../_shared/list-sharing-handler.ts';
import { createPublicTitleRequestThrottle } from '../_shared/public-title-throttle.ts';
import type { ListSharingState } from '../../../types/sharedList.ts';

Deno.serve(
  createManageListSharingHandler({
    allowRequest: createPublicTitleRequestThrottle(),
    requireUser: async (request) => (await requireAuth(request)).userId,
    manage: async (input, userId) => {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const key = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      const { data, error } = await createServiceClient().rpc(
        'manage_list_sharing',
        {
          p_list_id: input.listId,
          p_user_id: userId,
          p_action: input.action,
          p_expected_version: input.expectedVersion ?? null,
          p_new_key: input.action === 'share' ? key : null,
        },
      );
      if (error) throw new Error('List sharing failed.');
      return data as ListSharingState | { code: string };
    },
  }),
);
