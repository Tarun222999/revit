import NativePagerView from 'react-native-pager-view';
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type PagerViewRef = { setPage: (page: number) => void };
export type PageSelectedEvent = { nativeEvent: { position: number } };

type Props = {
  children: ReactNode;
  initialPage?: number;
  onPageSelected?: (event: PageSelectedEvent) => void;
  style?: StyleProp<ViewStyle>;
};

const PagerView = forwardRef<PagerViewRef, Props>(function PagerView(props, ref) {
  const nativeRef = useRef<NativePagerView>(null);

  useImperativeHandle(ref, () => ({
    setPage: (page) => {
      nativeRef.current?.setPage(page);
    },
  }), []);

  return <NativePagerView ref={nativeRef} {...props} />;
});

export default PagerView;
