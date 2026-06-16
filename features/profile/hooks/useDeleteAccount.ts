import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAccount } from '@/features/profile/api/profile-api';
import { supabase } from '@/lib/supabase/client';

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      queryClient.clear();
      await supabase.auth.signOut({ scope: 'local' });
    },
  });
}
