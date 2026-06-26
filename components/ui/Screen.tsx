import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewProps,
} from 'react-native';

import { cn } from '@/lib/utils/cn';

type ScreenProps = PropsWithChildren<
  ViewProps & {
    scroll?: boolean;
    padded?: boolean;
    safeAreaEdges?: Edge[];
  }
>;

export function Screen({
  children,
  className,
  scroll = false,
  padded = true,
  safeAreaEdges = ['right', 'bottom', 'left'],
  ...props
}: ScreenProps) {
  const contentClassName = cn('flex-1 bg-archive-900', padded && 'px-5 py-6', className);

  return (
    <SafeAreaView className="flex-1 bg-archive-900" edges={safeAreaEdges}>
      {scroll ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ScrollView
            automaticallyAdjustKeyboardInsets
            className="flex-1"
            contentContainerClassName={cn(
              padded && 'px-5 py-6',
              'pb-28',
              className,
            )}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            {...props}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View className={contentClassName} {...props}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
