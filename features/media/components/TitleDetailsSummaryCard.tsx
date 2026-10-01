import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

type TitleDetailsSummaryCardProps = {
  description?: string | null;
};

export function TitleDetailsSummaryCard({
  description,
}: TitleDetailsSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = Boolean(description);
  const canExpand = (description?.length ?? 0) > 220;

  return (
    <View className="gap-2">
      <Text className="font-serif text-2xl text-archive-50">The story</Text>
      <Text
        className="text-base leading-6 text-archive-100"
        numberOfLines={expanded || !canExpand ? undefined : 3}>
        {description || 'No story is available for this title yet.'}
      </Text>
      {hasDescription && canExpand ? (
        <Pressable
          accessibilityLabel={expanded ? 'Show less of the story' : 'Read more of the story'}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          className="min-h-11 self-start justify-center py-1"
          onPress={() => setExpanded((current) => !current)}>
          <Text className="text-sm font-semibold text-gold-300">
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
