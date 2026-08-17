import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export type JournalActionDrawerAction = {
  accessibilityHint?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'danger' | 'primary' | 'standard';
};

type JournalActionDrawerProps = {
  actions: JournalActionDrawerAction[];
  children?: ReactNode;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  prompt?: string;
  title: string;
  visible: boolean;
};

export function JournalActionDrawer({
  actions,
  children,
  description,
  footer,
  onClose,
  prompt,
  title,
  visible,
}: JournalActionDrawerProps) {
  const headingRef = useRef<React.ElementRef<typeof Text>>(null);

  useEffect(() => {
    if (!visible) return;

    AccessibilityInfo.announceForAccessibility(
      [title, description, prompt].filter(Boolean).join('. '),
    );
    const focusTimer = setTimeout(() => {
      const node = findNodeHandle(headingRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [description, prompt, title, visible]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable
          accessibilityLabel="Close actions"
          accessibilityRole="button"
          className="flex-1"
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          className="max-h-[82%] rounded-t-[32px] border border-archive-700 bg-archive-900 px-5 pb-8 pt-3"
          testID="journal-action-drawer"
        >
          <View className="mb-5 h-1 w-10 self-center rounded-full bg-archive-600" />
          <View className="mb-4 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <Text
                ref={headingRef}
                accessibilityRole="header"
                className="text-2xl font-bold text-archive-50"
              >
                {title}
              </Text>
              {description ? (
                <Text className="text-sm leading-5 text-archive-300">
                  {description}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Close actions"
              accessibilityRole="button"
              className="min-h-12 min-w-12 items-center justify-center rounded-full bg-archive-800"
              hitSlop={4}
              onPress={onClose}
            >
              <Ionicons color="#fbf6ec" name="close" size={22} />
            </Pressable>
          </View>
          {prompt ? (
            <Text className="mb-3 rounded-app border-l-2 border-gold-400 bg-archive-800 px-3 py-3 text-base leading-6 text-archive-100">
              {prompt}
            </Text>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
            <View className="border-t border-archive-700">
              {actions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityHint={action.accessibilityHint}
                  accessibilityLabel={action.label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: action.disabled }}
                  className={`min-h-14 flex-row items-center border-b border-archive-700 px-1 py-3 ${
                    action.disabled ? 'opacity-50' : ''
                  }`}
                  disabled={action.disabled}
                  onPress={action.onPress}
                >
                  <Text
                    className={`flex-1 text-base font-semibold ${
                      action.tone === 'danger'
                        ? 'text-reel-300'
                        : action.tone === 'primary'
                          ? 'text-gold-300'
                          : 'text-archive-50'
                    }`}
                  >
                    {action.label}
                  </Text>
                  <Ionicons
                    color={
                      action.tone === 'danger'
                        ? '#ef8c83'
                        : action.tone === 'primary'
                          ? '#f4c95d'
                          : '#b9aa97'
                    }
                    name="chevron-forward"
                    size={18}
                  />
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {footer ? <View className="border-t border-archive-700 pt-4">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
