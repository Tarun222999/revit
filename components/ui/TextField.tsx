import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { cn } from '@/lib/utils/cn';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextField({ label, error, className, ...props }: TextFieldProps) {
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm font-semibold text-archive-100">{label}</Text> : null}
      <TextInput
        className={cn(
          'min-h-12 rounded-app border bg-archive-800 px-4 text-base text-archive-50',
          error ? 'border-reel-400' : 'border-archive-500',
          className,
        )}
        placeholderTextColor="#aa9473"
        {...props}
      />
      {error ? <Text className="text-sm text-reel-400">{error}</Text> : null}
    </View>
  );
}
