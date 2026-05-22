import { Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/lib/utils/cn';

type ChipProps = PressableProps & {
  label: string;
  selected?: boolean;
};

export function Chip({ label, selected = false, className, ...props }: ChipProps) {
  return (
    <Pressable
      className={cn(
        'min-h-9 items-center justify-center rounded-full border px-4',
        selected ? 'border-gold-400 bg-gold-400' : 'border-archive-500 bg-archive-800',
        className,
      )}
      {...props}>
      <Text className={cn('text-sm font-semibold', selected ? 'text-archive-900' : 'text-archive-100')}>
        {label}
      </Text>
    </Pressable>
  );
}
