import { Text, View } from 'react-native';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <View className="flex-1 bg-archive-900 px-6 py-8">
      <View className="flex-1 justify-center gap-3">
        <Text className="text-4xl font-bold text-archive-50">{title}</Text>
        <Text className="text-base leading-6 text-archive-200">{description}</Text>
        <View className="h-1 w-16 rounded-full bg-gold-400" />
      </View>
    </View>
  );
}
