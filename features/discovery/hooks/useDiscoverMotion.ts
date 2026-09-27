import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';

/** Listen for changes during a session, not only Reanimated's startup snapshot. */
export function useDiscoverMotion() {
  const [reducedMotion, setReducedMotion] = useState(true);
  const [screenReader, setScreenReader] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    let mounted = true;
    let motionChanged = false;
    let readerChanged = false;
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => {
        motionChanged = true;
        setReducedMotion(value);
      },
    );
    const reader = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (value) => {
        readerChanged = true;
        setScreenReader(value);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted && !motionChanged) setReducedMotion(value);
      })
      .catch(() => {});
    void AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (mounted && !readerChanged) setScreenReader(value);
      })
      .catch(() => {});
    const app = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    // Android can lose interaction focus (e.g. notification shade) without backgrounding.
    const blur = Platform.OS === 'android'
      ? AppState.addEventListener('blur', () => setForeground(false)) : undefined;
    const focus = Platform.OS === 'android'
      ? AppState.addEventListener('focus', () => setForeground(AppState.currentState === 'active')) : undefined;
    return () => {
      mounted = false;
      motion?.remove();
      reader?.remove();
      app?.remove();
      blur?.remove();
      focus?.remove();
    };
  }, []);
  return { reducedMotion, foreground, screenReader };
}
