import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Card className="gap-4">
          <SectionHeader title={title} subtitle={description} />
        </Card>
        <View className="h-1 w-16 rounded-full bg-gold-400" />
      </View>
    </Screen>
  );
}
