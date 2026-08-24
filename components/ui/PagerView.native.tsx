import NativePagerView from 'react-native-pager-view';
import { forwardRef, type ReactNode } from 'react';
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
  return <NativePagerView ref={ref} {...props} />;
});

export default PagerView;
