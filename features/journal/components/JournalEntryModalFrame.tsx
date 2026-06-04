import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type JournalEntryModalFrameProps = {
  children: React.ReactNode;
  scroll?: boolean;
};

function useKeyboardInset(bottomInset: number) {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(Math.max(0, event.endCoordinates.height - bottomInset));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [bottomInset]);

  return keyboardInset;
}

export function JournalEntryModalFrame({
  children,
  scroll = false,
}: JournalEntryModalFrameProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboardInset = useKeyboardInset(insets.bottom);
  const contentClassName = scroll ? 'gap-5 px-5 py-5' : 'p-5';
  const keyboardPadding = keyboardInset > 0 ? keyboardInset + 8 : 0;
  const modalMaxHeight =
    keyboardInset > 0
      ? Math.max(360, height - keyboardPadding - insets.top - 24)
      : '92%';

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top', 'right', 'bottom', 'left']}
      style={{ backgroundColor: 'rgba(13, 11, 9, 0.72)' }}
    >
      <View
        className="flex-1 justify-end px-3 pt-8"
        style={{ paddingBottom: keyboardPadding }}
      >
        <View
          className="w-full max-w-xl self-center overflow-hidden rounded-app border border-archive-700 bg-archive-900"
          style={{ maxHeight: modalMaxHeight }}
        >
          <View className="flex-row items-center justify-between gap-4 border-b border-archive-700 px-5 py-4">
            <Text
              className="min-w-0 flex-1 text-lg font-bold text-archive-50"
              numberOfLines={1}
            >
              Journal Entry
            </Text>
            <Pressable
              accessibilityLabel="Close journal entry modal"
              accessibilityRole="button"
              hitSlop={10}
              className="h-10 w-10 items-center justify-center rounded-full border border-archive-700 bg-archive-800"
              onPress={() => router.back()}
            >
              <Ionicons color="#fbf6ec" name="close" size={20} />
            </Pressable>
          </View>
          {scroll ? (
            <ScrollView
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              className="min-h-0"
              contentContainerClassName={contentClassName}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View className={contentClassName}>{children}</View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
