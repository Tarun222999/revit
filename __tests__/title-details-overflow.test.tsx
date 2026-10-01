import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform, Share } from 'react-native';

import { TitleDetailsOverflow } from '@/features/media/components/TitleDetailsOverflow';

jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  // Native Modals render in a separate root, so keep its children in this
  // test renderer and expose a dismissal trigger for iOS presentation order.
  default: ({ children, onDismiss }: { children: unknown; onDismiss?: () => void }) =>
    require('react').createElement(
      require('react-native').View,
      null,
      children,
      require('react').createElement(require('react-native').Pressable, {
        onPress: onDismiss,
        testID: 'mock-modal-dismiss',
      }),
    ),
}));

describe('Title Details share overflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('waits for iOS menu dismissal before sharing the canonical URL', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const view = await render(
      <TitleDetailsOverflow item={{ source: 'tmdb', sourceId: 'tv:37854' }} />,
    );

    const trigger = view.getByRole('button', { name: 'More title options' });
    expect(trigger.props.accessibilityState.expanded).toBe(false);

    await fireEvent.press(trigger);
    expect(view.getByRole('button', { name: 'Share title' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Share title' }));
    expect(Share.share).not.toHaveBeenCalled();
    await fireEvent.press(view.getByTestId('mock-modal-dismiss'));
    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        message: 'revit://title/tmdb%3Atv%3A37854',
      });
    });
    expect(Share.share).toHaveBeenCalledTimes(1);
  });

  it('shares immediately on Android after closing the title menu', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const view = await render(
      <TitleDetailsOverflow item={{ source: 'igdb', sourceId: '1942' }} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'More title options' }));
    await fireEvent.press(view.getByRole('button', { name: 'Share title' }));

    await waitFor(() => expect(Share.share).toHaveBeenCalledWith({
      message: 'revit://title/igdb%3A1942',
    }));
  });
});
