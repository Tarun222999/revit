import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils/cn';

type AccountRowTone = 'default' | 'danger';

type ProfileAccountRowProps = {
  title: string;
  description?: string;
  tone?: AccountRowTone;
  disabled?: boolean;
  onPress?: () => void;
};

const ROW_CHEVRON_COLOR = '#d9c8aa';

export function ProfileAccountRow({
  title,
  description,
  tone = 'default',
  disabled = false,
  onPress,
}: ProfileAccountRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      className={cn(
        'rounded-app border border-archive-700 bg-archive-800 px-4 py-3',
        disabled && 'opacity-60',
      )}>
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text
            className={cn(
              'text-base font-semibold',
              tone === 'danger' ? 'text-reel-300' : 'text-archive-50',
            )}>
            {title}
          </Text>
          {description ? (
            <Text className="text-sm leading-5 text-archive-300">
              {description}
            </Text>
          ) : null}
        </View>
        {onPress ? (
          <Ionicons
            accessibilityElementsHidden
            color={ROW_CHEVRON_COLOR}
            importantForAccessibility="no-hide-descendants"
            name="chevron-forward"
            size={18}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
