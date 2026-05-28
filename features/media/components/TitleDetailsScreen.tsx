import { ActivityIndicator, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useMediaDetails } from '@/features/media/hooks/useMediaDetails';
import { MEDIA_TYPE_LABELS } from '@/constants/media';

type TitleDetailsScreenProps = {
  titleId?: string;
};

export function TitleDetailsScreen({ titleId }: TitleDetailsScreenProps) {
  const detailsQuery = useMediaDetails(titleId);
  const item = detailsQuery.data?.item;

  return (
    <Screen scroll className="gap-6">
      <SectionHeader
        title="Title Details"
        subtitle="Phase 2 verification for normalized media details."
      />

      {detailsQuery.isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator color="#d6a84f" />
        </View>
      ) : null}

      {detailsQuery.isError ? (
        <Card>
          <Text className="text-base font-semibold text-reel-300">
            Details failed
          </Text>
          <Text className="mt-2 text-sm leading-5 text-archive-300">
            {detailsQuery.error instanceof Error
              ? detailsQuery.error.message
              : 'Unable to load this title right now.'}
          </Text>
        </Card>
      ) : null}

      {item ? (
        <Card className="gap-4">
          <View className="gap-1">
            <Text className="text-2xl font-bold text-archive-50">
              {item.title}
            </Text>
            <Text className="text-sm text-archive-300">
              {MEDIA_TYPE_LABELS[item.mediaType]}
              {item.year ? ` • ${item.year}` : ''}
            </Text>
          </View>

          {item.description ? (
            <Text className="text-base leading-6 text-archive-100">
              {item.description}
            </Text>
          ) : null}

          <View className="gap-1 border-t border-archive-700 pt-4">
            <Text className="text-xs font-semibold uppercase text-gold-300">
              Internal reference
            </Text>
            <Text className="text-sm text-archive-300">
              {item.id ?? 'Not persisted yet'}
            </Text>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
