import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  updateProfile,
  type UpdateProfileInput,
} from '@/features/profile/api/profile-api';
import { currentProfileQueryKey } from '@/features/profile/hooks/useCurrentProfile';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(currentProfileQueryKey(profile.id), profile);
    },
  });
}
