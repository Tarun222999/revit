import { Text, View } from 'react-native';

import { cn } from '@/lib/utils/cn';

type NoticeTone = 'info' | 'success' | 'warning' | 'error';

type InlineNoticeProps = {
  message: string;
  tone?: NoticeTone;
};

const toneClasses: Record<NoticeTone, string> = {
  info: 'border-teal-500',
  success: 'border-teal-300',
  warning: 'border-gold-400',
  error: 'border-reel-500',
};

export function InlineNotice({ message, tone = 'info' }: InlineNoticeProps) {
  return (
    <View className={cn('rounded-app border bg-archive-800 px-4 py-3', toneClasses[tone])}>
      <Text className="text-sm leading-5 text-archive-100">{message}</Text>
    </View>
  );
}
