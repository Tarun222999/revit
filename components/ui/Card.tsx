import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils/cn';

type CardProps = ViewProps & {
  elevated?: boolean;
};

export function Card({ className, elevated = false, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-app border border-archive-700 bg-archive-800 p-4',
        elevated && 'shadow-lg shadow-archive-900',
        className,
      )}
      {...props}
    />
  );
}
