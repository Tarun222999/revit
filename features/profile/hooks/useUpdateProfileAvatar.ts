import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  updateProfileAvatar,
  uploadProfileAvatar,
  type UploadProfileAvatarInput,
} from '@/features/profile/api/profile-api';
import { currentProfileQueryKey } from '@/features/profile/hooks/useCurrentProfile';

export function useUpdateProfileAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadProfileAvatarInput) => {
      const avatarPath = await uploadProfileAvatar(input);

      return updateProfileAvatar({
        avatarPath,
        userId: input.userId,
      });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(currentProfileQueryKey(profile.id), profile);
    },
  });
}
