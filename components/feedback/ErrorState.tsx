import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';

type ErrorStateProps = {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  retryLabel = 'Try again',
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <View className="gap-4 rounded-app border border-reel-500 bg-archive-800 p-5">
      <View className="gap-2">
        <Text className="text-lg font-bold text-archive-50">{title}</Text>
        <Text className="text-sm leading-5 text-archive-300">{message}</Text>
      </View>
      {onRetry ? (
        <Button
          title={retryLabel}
          variant="secondary"
          loading={retrying}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}
