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

type JournalActionConfirmationProps = {
  body: string;
  cancelLabel?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  onSecondary?: () => void;
  pending?: boolean;
  confirmVariant?: 'danger' | 'primary';
  secondaryLabel?: string;
  title: string;
  visible: boolean;
};

export function JournalActionConfirmation({
  body,
  cancelLabel = 'Keep plan',
  confirmLabel,
  confirmVariant = 'danger',
  onCancel,
  onConfirm,
  onSecondary,
  pending = false,
  secondaryLabel,
  title,
  visible,
}: JournalActionConfirmationProps) {
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
      onRequestClose={pending ? undefined : onCancel}
      statusBarTranslucent
      testID="journal-action-confirmation-modal"
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/75 px-5">
        <Pressable
          accessible={false}
          className="absolute inset-0"
          disabled={pending}
          onPress={onCancel}
        />
        <View
          accessibilityViewIsModal
          className="w-full max-w-md gap-5 rounded-app border border-gold-400 bg-archive-900 p-6"
          testID="journal-action-confirmation"
        >
          <View className="gap-2">
            <Text
              ref={headingRef}
              accessibilityLabel={title}
              accessibilityRole="header"
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
              onPress={onCancel}
              title={cancelLabel}
              variant="secondary"
            />
            {secondaryLabel && onSecondary ? (
              <Button
                className="min-h-12"
                disabled={pending}
                onPress={onSecondary}
                title={secondaryLabel}
                variant="secondary"
              />
            ) : null}
            <Button
              className="min-h-12"
              disabled={pending}
              loading={pending}
              onPress={onConfirm}
              title={confirmLabel}
              variant={confirmVariant}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
