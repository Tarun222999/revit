import { Text, View } from 'react-native';

import { JOURNAL_STATUS_LABELS, type JournalStatus } from '@/constants/journal';
import { cn } from '@/lib/utils/cn';

type StatusBadgeProps = {
  status: JournalStatus;
};

const statusClasses: Record<JournalStatus, string> = {
  planned: 'bg-archive-700',
  in_progress: 'bg-teal-500',
  completed: 'bg-gold-500',
  dropped: 'bg-reel-500',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <View className={cn('rounded-full px-3 py-1', statusClasses[status])}>
      <Text className="text-xs font-bold text-archive-50">{JOURNAL_STATUS_LABELS[status]}</Text>
    </View>
  );
}
