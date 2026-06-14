import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { UserListDetails, UserListSummary } from '@/features/lists/types';

type DeleteListConfirmationProps = {
  error?: string | null;
  isDeleting: boolean;
  list: Pick<UserListSummary | UserListDetails, 'name'>;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteListConfirmation({
  error,
  isDeleting,
  list,
  onCancel,
  onConfirm,
}: DeleteListConfirmationProps) {
  return (
    <Card className="gap-4 border-reel-500/70">
      <View className="gap-2">
        <Text className="text-xl font-bold text-archive-50">Delete list?</Text>
        <Text className="text-sm leading-5 text-archive-300">
          This removes {list.name} and its saved list items. The media titles and journal entries stay untouched.
        </Text>
      </View>

      {error ? (
        <Text className="text-sm leading-5 text-reel-400">{error}</Text>
      ) : null}

      <View className="gap-3">
        <Button
          disabled={isDeleting}
          onPress={onCancel}
          title="Keep List"
          variant="secondary"
        />
        <Button
          loading={isDeleting}
          onPress={onConfirm}
          title="Delete List"
          variant="danger"
        />
      </View>
    </Card>
  );
}
