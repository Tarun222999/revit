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

type JournalDiscardConfirmationProps = {
  onDiscard: () => void;
  onKeepEditing: () => void;
  visible: boolean;
};

const TITLE = 'Discard changes?';
const BODY = 'Your unsaved Journal changes will be lost.';

export function JournalDiscardConfirmation({
  onDiscard,
  onKeepEditing,
  visible,
}: JournalDiscardConfirmationProps) {
  const headingRef = useRef<React.ElementRef<typeof Text>>(null);

  useEffect(() => {
    if (!visible) return;

    AccessibilityInfo.announceForAccessibility(`${TITLE} ${BODY}`);
    const focusTimer = setTimeout(() => {
      const headingNode = findNodeHandle(headingRef.current);
      if (headingNode) AccessibilityInfo.setAccessibilityFocus(headingNode);
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onKeepEditing}
      statusBarTranslucent
      testID="journal-discard-modal"
      transparent
      visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/75 px-5">
        <Pressable
          accessible={false}
          className="absolute inset-0"
          onPress={onKeepEditing}
        />
        <View
          accessibilityViewIsModal
          className="w-full max-w-md gap-5 rounded-app border border-archive-600 bg-archive-900 p-6"
          testID="journal-discard-confirmation">
          <View className="gap-2">
            <Text
              ref={headingRef}
              accessibilityLabel={TITLE}
              accessibilityRole="alert"
              className="text-2xl font-bold text-archive-50">
              {TITLE}
            </Text>
            <Text className="text-base leading-6 text-archive-200">{BODY}</Text>
          </View>
          <View className="gap-3">
            <Button
              className="min-h-12"
              onPress={onKeepEditing}
              title="Keep editing"
              variant="secondary"
            />
            <Button
              className="min-h-12"
              onPress={onDiscard}
              title="Discard"
              variant="danger"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
