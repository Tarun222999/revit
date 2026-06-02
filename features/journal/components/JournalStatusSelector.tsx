import { Pressable, Text, View } from 'react-native';

import {
  JOURNAL_STATUS_OPTIONS,
  type JournalStatus,
} from '@/constants/journal';
import { cn } from '@/lib/utils/cn';

type JournalStatusSelectorProps = {
  value: JournalStatus;
  onChange: (value: JournalStatus) => void;
};

export function JournalStatusSelector({
  value,
  onChange,
}: JournalStatusSelectorProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-archive-100">Status</Text>
      <View className="flex-row flex-wrap gap-2">
        {JOURNAL_STATUS_OPTIONS.map((option) => {
          const selected = value === option.value;

          return (
            <Pressable
              accessibilityRole="button"
              className={cn(
                'min-h-11 flex-1 basis-[45%] items-center justify-center rounded-app border px-3',
                selected
                  ? 'border-gold-400 bg-gold-400'
                  : 'border-archive-700 bg-archive-800',
              )}
              key={option.value}
              onPress={() => onChange(option.value)}>
              <Text
                className={cn(
                  'text-center text-sm font-semibold',
                  selected ? 'text-archive-900' : 'text-archive-100',
                )}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
