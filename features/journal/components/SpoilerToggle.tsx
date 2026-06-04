import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/utils/cn';

type SpoilerToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
};

export function SpoilerToggle({ value, onChange }: SpoilerToggleProps) {
  return (
    <Pressable
      accessibilityLabel="Contains spoilers"
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className={cn(
        'flex-row items-center gap-4 rounded-app border p-4',
        value
          ? 'border-reel-500/70 bg-reel-500/10'
          : 'border-archive-700 bg-archive-800',
      )}
      onPress={() => onChange(!value)}
    >
      <View
        className={cn(
          'h-11 w-11 items-center justify-center rounded-full border',
          value
            ? 'border-reel-400 bg-reel-500/20'
            : 'border-archive-600 bg-archive-900',
        )}
      >
        <Ionicons
          color={value ? '#f87171' : '#aa9473'}
          name={value ? 'warning' : 'shield-checkmark-outline'}
          size={20}
        />
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-bold text-archive-50">
          Contains spoilers
        </Text>
        <Text className="text-sm leading-5 text-archive-300">
          {value
            ? 'Spoiler warnings will be shown before this review preview.'
            : 'Mark this if your review reveals important story details.'}
        </Text>
      </View>

      <View
        className={cn(
          'h-7 w-7 items-center justify-center rounded-full border',
          value
            ? 'border-reel-400 bg-reel-500'
            : 'border-archive-600 bg-archive-900',
        )}
      >
        {value ? <Ionicons color="#fbf6ec" name="checkmark" size={16} /> : null}
      </View>
    </Pressable>
  );
}
