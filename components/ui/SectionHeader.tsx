import { Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
};

export function SectionHeader({ title, subtitle, actionLabel }: SectionHeaderProps) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="text-xl font-bold text-archive-50">{title}</Text>
        {actionLabel ? <Text className="text-sm font-semibold text-gold-300">{actionLabel}</Text> : null}
      </View>
      {subtitle ? <Text className="text-sm leading-5 text-archive-300">{subtitle}</Text> : null}
    </View>
  );
}
