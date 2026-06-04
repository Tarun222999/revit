import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';

type DeleteEntryConfirmationProps = {
  error?: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
};

export function DeleteEntryConfirmation({
  error,
  isDeleting,
  onCancel,
  onConfirm,
  title,
}: DeleteEntryConfirmationProps) {
  return (
    <SafeAreaView
      className="absolute inset-0 justify-end px-3 pb-4"
      edges={['right', 'bottom', 'left']}
    >
      <Pressable
        accessibilityLabel="Cancel delete journal entry"
        accessibilityRole="button"
        className="absolute inset-0 bg-archive-950/70"
        disabled={isDeleting}
        onPress={onCancel}
      />
      <View className="w-full max-w-xl self-center rounded-app border border-reel-500/50 bg-archive-900 p-5 shadow-lg shadow-archive-950">
        <View className="gap-2">
          <Text className="text-xl font-bold text-archive-50">
            Delete journal entry?
          </Text>
          <Text className="text-sm leading-5 text-archive-300">
            {title
              ? `This removes your status, rating, and review for ${title}.`
              : 'This removes your status, rating, and review for this title.'}
          </Text>
          <Text className="text-sm leading-5 text-archive-300">
            You can add it back later from Title Details.
          </Text>
        </View>

        {error ? (
          <Text className="mt-4 text-sm leading-5 text-reel-400">{error}</Text>
        ) : null}

        <View className="mt-5 gap-3">
          <Button
            disabled={isDeleting}
            onPress={onCancel}
            title="Keep Entry"
            variant="secondary"
          />
          <Button
            loading={isDeleting}
            onPress={onConfirm}
            title="Delete Entry"
            variant="danger"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
