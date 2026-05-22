import { Text, View } from 'react-native';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <View className="flex-1 bg-ink-50 px-6 py-8 dark:bg-ink-900">
      <View className="flex-1 justify-center gap-3">
        <Text className="text-4xl font-bold text-ink-900 dark:text-ink-50">{title}</Text>
        <Text className="text-base leading-6 text-ink-500 dark:text-ink-300">{description}</Text>
      </View>
    </View>
  );
}
