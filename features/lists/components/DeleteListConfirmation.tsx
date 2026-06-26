import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible>
      <SafeAreaView
        className="flex-1"
        edges={['top', 'right', 'bottom', 'left']}
        style={{ backgroundColor: 'rgba(13, 11, 9, 0.72)' }}>
        <Pressable className="flex-1 justify-end px-3 pb-5" onPress={onCancel}>
          <Pressable
            className="w-full max-w-xl self-center"
            onPress={(event) => event.stopPropagation()}>
            <Card className="gap-4 border-reel-500/70 p-5">
              <View className="gap-2">
                <Text className="text-xl font-bold text-archive-50">
                  Delete "{list.name}"?
                </Text>
                <Text className="text-sm leading-5 text-archive-300">
                  This removes the list and its saved items. Your journal entries stay untouched.
                </Text>
              </View>

              {error ? (
                <Text className="text-sm leading-5 text-reel-400">{error}</Text>
              ) : null}

              <View className="gap-3">
                <Button
                  disabled={isDeleting}
                  onPress={onCancel}
                  title="Cancel"
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
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
