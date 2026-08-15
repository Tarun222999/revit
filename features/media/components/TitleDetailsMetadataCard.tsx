import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

import type { TitleDetailMetric } from '@/features/media/model/titleDetails';

type TitleDetailsMetadataCardProps = {
  details: TitleDetailMetric[];
};

const initiallyVisibleDetailCount = 2;

function DetailMetric({ label, value }: TitleDetailMetric) {
  return (
    <View className="flex-row items-start justify-between gap-5 border-b border-archive-700 py-3">
      <Text className="text-sm text-archive-300">{label}</Text>
      <Text className="max-w-[65%] text-right text-sm font-medium text-archive-100">
        {value}
      </Text>
    </View>
  );
}

export function TitleDetailsMetadataCard({
  details,
}: TitleDetailsMetadataCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (details.length === 0) {
    return null;
  }

  const canCollapse = details.length > initiallyVisibleDetailCount + 1;
  const visibleDetails = expanded || !canCollapse
    ? details
    : details.slice(0, initiallyVisibleDetailCount);
  const hiddenCount = details.length - visibleDetails.length;

  return (
    <View>
      <Text className="font-serif text-2xl text-archive-50">Details</Text>
      <View className="mt-2 border-t border-archive-700">
        {visibleDetails.map((detail) => (
          <DetailMetric
            key={detail.label}
            label={detail.label}
            value={detail.value}
          />
        ))}
      </View>
      {canCollapse ? (
        <Pressable
          accessibilityLabel={expanded ? 'Show fewer title details' : `Show ${hiddenCount} more title details`}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          className="min-h-11 self-start justify-center py-1"
          onPress={() => setExpanded((current) => !current)}>
          <Text className="text-sm font-semibold text-gold-300">
            {expanded ? 'Show fewer details' : `See ${hiddenCount} more details`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
