import { router } from 'expo-router';
import { useEffect } from 'react';

import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useListDetails } from '@/features/lists/hooks/useListDetails';

type ListDetailsScreenProps = {
  listId?: string;
};

export function ListDetailsScreen({ listId }: ListDetailsScreenProps) {
  const { user } = useAuth();
  const listQuery = useListDetails(user?.id, listId);

  useEffect(() => {
    if (listQuery.isSuccess && !listQuery.data) {
      router.replace('/lists');
    }
  }, [listQuery.data, listQuery.isSuccess]);

  return (
    <PlaceholderScreen
      title="List Details"
      description={`Phase 6 will show list metadata and items here. Current route id: ${listId ?? 'none'}.`}
    />
  );
}
