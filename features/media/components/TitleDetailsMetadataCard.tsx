import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { TitleDetailMetric } from '@/features/media/model/titleDetails';

type TitleDetailsMetadataCardProps = {
  details: TitleDetailMetric[];
};

function DetailMetric({ label, value }: TitleDetailMetric) {
  return (
    <View className="min-w-[45%] flex-1 rounded-app border border-archive-700 bg-archive-900 p-3">
      <Text className="text-xs font-semibold uppercase text-archive-300">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-bold text-archive-50">{value}</Text>
    </View>
  );
}

export function TitleDetailsMetadataCard({
  details,
}: TitleDetailsMetadataCardProps) {
  if (details.length === 0) {
    return null;
  }

  return (
    <Card className="gap-3">
      <Text className="text-lg font-bold text-archive-50">Details</Text>
      <View className="flex-row flex-wrap gap-3">
        {details.map((detail) => (
          <DetailMetric
            key={detail.label}
            label={detail.label}
            value={detail.value}
          />
        ))}
      </View>
    </Card>
  );
}
