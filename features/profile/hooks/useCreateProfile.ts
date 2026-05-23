import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createProfile, type CreateProfileInput } from '@/features/profile/api/profile-api';
import { currentProfileQueryKey } from '@/features/profile/hooks/useCurrentProfile';

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProfileInput) => createProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(currentProfileQueryKey(profile.id), profile);
    },
  });
}
