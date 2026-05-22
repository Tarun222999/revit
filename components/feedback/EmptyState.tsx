import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center gap-4 rounded-app border border-archive-700 bg-archive-800 p-6">
      <View className="h-12 w-12 rounded-full bg-shelf-700" />
      <View className="items-center gap-2">
        <Text className="text-center text-lg font-bold text-archive-50">{title}</Text>
        <Text className="text-center text-sm leading-5 text-archive-300">{message}</Text>
      </View>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
