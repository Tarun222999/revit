import {
  Children,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export type PagerViewRef = { setPage: (page: number) => void };
export type PageSelectedEvent = { nativeEvent: { position: number } };

type Props = {
  children: ReactNode;
  initialPage?: number;
  onPageSelected?: (event: PageSelectedEvent) => void;
  style?: StyleProp<ViewStyle>;
};

const PagerView = forwardRef<PagerViewRef, Props>(function PagerView(
  { children, initialPage = 0, onPageSelected, style },
  ref,
) {
  const pages = Children.toArray(children);
  const [page, setPage] = useState(initialPage);
  const selectPage = useCallback((nextPage: number) => {
    const clamped = Math.max(0, Math.min(nextPage, pages.length - 1));
    setPage(clamped);
    onPageSelected?.({ nativeEvent: { position: clamped } });
  }, [onPageSelected, pages.length]);

  useImperativeHandle(ref, () => ({ setPage: selectPage }), [selectPage]);

  return <View style={style}>{pages[page] ?? null}</View>;
});

export default PagerView;
