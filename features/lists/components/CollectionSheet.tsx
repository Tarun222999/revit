import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collectionTitleStyle } from './ListCard';

export function CollectionSheet({
  title,
  onClose,
  children,
  busy = false,
  visible = true,
  onDismiss,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  visible?: boolean;
  onDismiss?: () => void;
}) {
  const heading = useRef<Text>(null);
  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(title);
  }, [title, visible]);
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof document === 'undefined')
      return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, busy, onClose]);
  return (
    <Modal
      transparent
      visible={visible}
      onDismiss={onDismiss}
      animationType="none"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
      onShow={() => {
        // React Native Web's Modal manages DOM focus; findNodeHandle throws there.
        if (Platform.OS === 'web') return;
        const node = findNodeHandle(heading.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }}
    >
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#0009' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end"
        >
          <Pressable
            accessibilityLabel="Dismiss panel"
            accessible={false}
            className="flex-1"
            onPress={() => {
              if (!busy) onClose();
            }}
          />
          <Animated.View
            entering={FadeIn.duration(140).reduceMotion(ReduceMotion.System)}
            accessibilityViewIsModal
            className="max-h-[90%] w-full max-w-xl self-center rounded-t-3xl border border-archive-600 bg-archive-800"
          >
            <View className="flex-row items-center gap-3 px-5 pt-5">
              <Text
                ref={heading}
                accessibilityRole="header"
                className="min-w-0 flex-1 text-2xl text-archive-50"
                style={collectionTitleStyle}
              >
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Close ${title}`}
                disabled={busy}
                className="h-12 w-12 items-center justify-center"
                onPress={onClose}
              >
                <Ionicons name="close" size={22} color="#fbf6ec" />
              </Pressable>
            </View>
            <ScrollView
              automaticallyAdjustKeyboardInsets
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="gap-4 p-5 pb-8"
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
