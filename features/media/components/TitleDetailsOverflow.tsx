import { Ionicons } from '@expo/vector-icons';
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { createTitleShareUrl } from '@/features/sharing/model/titleShare';
import type { NormalizedMediaItem } from '@/types/media';

type Props = {
  item: Pick<NormalizedMediaItem, 'source' | 'sourceId'>;
};

export function TitleDetailsOverflow({ item }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareAfterDismissal, setShareAfterDismissal] = useState(false);
  const triggerRef = useRef<View>(null);
  const shareRef = useRef<View>(null);
  const wasOpenRef = useRef(false);

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    wasOpenRef.current = true;

    const timeout = setTimeout(() => {
      const node = findNodeHandle(shareRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 0);

    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !wasOpenRef.current || !triggerRef.current) return;

    const node = findNodeHandle(triggerRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
    wasOpenRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web' || typeof document === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const share = async () => {
    try {
      // The payload must contain only the canonical app URL—never title or
      // sender text, Journal data, or an internal media UUID.
      await Share.share({ message: createTitleShareUrl(item) });
    } catch {
      Alert.alert(
        'Sharing unavailable',
        'Revit could not open sharing right now. Try again when you are ready.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Try again', onPress: () => void share() },
        ],
      );
    }
  };

  const requestShare = () => {
    if (Platform.OS === 'ios') {
      setShareAfterDismissal(true);
      close();
      return;
    }

    close();
    void share();
  };

  const handleModalDismiss = () => {
    if (!shareAfterDismissal) return;

    setShareAfterDismissal(false);
    void share();
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityLabel="More title options"
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        className="mr-1 h-11 w-11 items-center justify-center rounded-full bg-archive-900/80"
        hitSlop={8}
        onPress={() => setIsOpen((open) => !open)}>
        <Ionicons color="#fbf6ec" name="ellipsis-horizontal" size={23} />
      </Pressable>

      <Modal
        animationType="fade"
        onDismiss={handleModalDismiss}
        onRequestClose={close}
        transparent
        visible={isOpen}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close title options"
          className="flex-1 bg-black/45"
          onPress={close}>
          <View className="mt-24 self-end overflow-hidden rounded-app border border-archive-600 bg-archive-800 shadow-2xl">
            <Pressable
              ref={shareRef}
              accessibilityLabel="Share title"
              accessibilityRole="button"
              className="min-h-12 min-w-48 flex-row items-center gap-3 px-4 py-3"
              onPress={requestShare}>
              <Ionicons color="#e8c77d" name="share-social-outline" size={20} />
              <Text className="text-base font-semibold text-archive-50">Share title</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
