import { ActivityIndicator, Text, View } from 'react-native';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = 'Loading' }: LoadingStateProps) {
  return (
    <View className="items-center justify-center gap-3 rounded-app border border-archive-700 bg-archive-800 p-6">
      <ActivityIndicator color="#d7a94d" />
      <Text className="text-sm font-semibold text-archive-200">{message}</Text>
    </View>
  );
}
