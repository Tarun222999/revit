import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils/cn';

type ScreenProps = PropsWithChildren<
  ViewProps & {
    scroll?: boolean;
    padded?: boolean;
  }
>;

export function Screen({ children, className, scroll = false, padded = true, ...props }: ScreenProps) {
  const contentClassName = cn('flex-1 bg-archive-900', padded && 'px-5 py-6', className);

  return (
    <SafeAreaView className="flex-1 bg-archive-900">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn(padded && 'px-5 py-6')}
          showsVerticalScrollIndicator={false}
          {...props}>
          {children}
        </ScrollView>
      ) : (
        <View className={contentClassName} {...props}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
