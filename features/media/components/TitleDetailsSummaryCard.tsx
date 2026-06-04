import { Text } from 'react-native';

import { Card } from '@/components/ui/Card';

type TitleDetailsSummaryCardProps = {
  description?: string | null;
};

export function TitleDetailsSummaryCard({
  description,
}: TitleDetailsSummaryCardProps) {
  return (
    <Card className="gap-3">
      <Text className="text-lg font-bold text-archive-50">Summary</Text>
      <Text className="text-base leading-6 text-archive-100">
        {description || 'No summary is available for this title yet.'}
      </Text>
    </Card>
  );
}
