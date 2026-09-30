import { usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';

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
