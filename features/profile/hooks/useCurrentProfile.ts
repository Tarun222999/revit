import { useQuery } from '@tanstack/react-query';

import { getCurrentProfile } from '@/features/profile/api/profile-api';

export const currentProfileQueryKey = (userId?: string) => ['profile', 'current', userId] as const;

export function useCurrentProfile(userId?: string) {
  return useQuery({
    queryKey: currentProfileQueryKey(userId),
    queryFn: () => getCurrentProfile(userId ?? ''),
    enabled: Boolean(userId),
  });
}
