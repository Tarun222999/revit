import { usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';

export function useCollectionDismiss(
  open: boolean,
  dirty: boolean,
  busy: boolean,
  close: () => void,
) {
  const confirming = useRef(false);
  const dismiss = useCallback(() => {
    if (busy || confirming.current) return;
    if (!dirty) {
      close();
      return;
    }
    confirming.current = true;
    // React Native Web's Alert.alert is a no-op.
    if (Platform.OS === 'web') {
      const discard = window.confirm(
        'Discard changes? Your unsaved changes will be lost.',
      );
      confirming.current = false;
      if (discard) close();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'Your unsaved changes will be lost.',
      [
        {
          text: 'Keep editing',
          style: 'cancel',
          onPress: () => {
            confirming.current = false;
          },
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            confirming.current = false;
            close();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          confirming.current = false;
        },
      },
    );
  }, [busy, dirty, close]);
  usePreventRemove(open, dismiss);
  return dismiss;
}
