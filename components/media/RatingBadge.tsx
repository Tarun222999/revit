import { Text, View } from 'react-native';

type RatingBadgeProps = {
  rating?: number | null;
};

export function RatingBadge({ rating }: RatingBadgeProps) {
  if (rating == null) {
    return null;
  }

  return (
    <View className="rounded-full bg-gold-400 px-3 py-1">
      <Text className="text-xs font-bold text-archive-900">{rating.toFixed(1)}</Text>
    </View>
  );
}
