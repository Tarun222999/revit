import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';

type JournalActionFeedbackProps = {
  body: string;
  onClose: () => void;
  onRetry: () => void;
  pending?: boolean;
  title: string;
  visible: boolean;
};

export function JournalActionFeedback({
  body,
  onClose,
  onRetry,
  pending = false,
  title,
  visible,
}: JournalActionFeedbackProps) {
  const headingRef = useRef<React.ElementRef<typeof Text>>(null);

  useEffect(() => {
    if (!visible) return;

    AccessibilityInfo.announceForAccessibility(`${title} ${body}`);
    const focusTimer = setTimeout(() => {
      const headingNode = findNodeHandle(headingRef.current);
      if (headingNode) AccessibilityInfo.setAccessibilityFocus(headingNode);
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [body, title, visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={pending ? undefined : onClose}
      statusBarTranslucent
      testID="journal-action-feedback-modal"
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/75 px-5">
        <Pressable
          accessible={false}
          className="absolute inset-0"
          disabled={pending}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          className="w-full max-w-md gap-5 rounded-app border border-reel-400 bg-archive-900 p-6"
          testID="journal-action-feedback"
        >
          <View className="gap-2">
            <Text
              ref={headingRef}
              accessibilityLabel={title}
              accessibilityRole="alert"
              className="text-2xl font-bold text-archive-50"
            >
              {title}
            </Text>
            <Text className="text-base leading-6 text-archive-200">{body}</Text>
          </View>
          <View className="gap-3">
            <Button
              className="min-h-12"
              disabled={pending}
              loading={pending}
              onPress={onRetry}
              title="Try again"
              variant="primary"
            />
            <Button
              className="min-h-12"
              disabled={pending}
              onPress={onClose}
              title="Close"
              variant="secondary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
