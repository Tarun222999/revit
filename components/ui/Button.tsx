import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gold-400',
  secondary: 'border border-archive-500 bg-archive-800',
  ghost: 'bg-transparent',
  danger: 'bg-reel-500',
};

const textClasses: Record<ButtonVariant, string> = {
  primary: 'text-archive-900',
  secondary: 'text-archive-50',
  ghost: 'text-gold-300',
  danger: 'text-archive-50',
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'min-h-12 items-center justify-center rounded-app px-5',
        variantClasses[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      disabled={isDisabled}
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#0d0b09' : '#fbf6ec'} />
      ) : (
        <Text
          adjustsFontSizeToFit
          className={cn(
            'w-full text-center text-base font-semibold',
            textClasses[variant],
          )}
          numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
