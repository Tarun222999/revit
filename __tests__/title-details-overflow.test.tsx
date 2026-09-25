import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { TitleDetailsOverflow } from '@/features/media/components/TitleDetailsOverflow';

jest.mock('react-native/Libraries/Modal/Modal', () => ({
  __esModule: true,
  // Native Modals render in a separate root, so keep its children in this
  // test renderer to exercise menu state and the action itself.
  default: ({ children }: { children: unknown }) => children,
}));

describe('Title Details share overflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses a title-level accessible menu and shares only the canonical URL', async () => {
    const view = await render(
      <TitleDetailsOverflow item={{ source: 'tmdb', sourceId: 'tv:37854' }} />,
    );

    const trigger = view.getByRole('button', { name: 'More title options' });
    expect(trigger.props.accessibilityState.expanded).toBe(false);

    await fireEvent.press(trigger);
    expect(view.getByRole('button', { name: 'Share title' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Share title' }));
    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        message: 'revit://title/tmdb%3Atv%3A37854',
      });
    });
    expect(Share.share).toHaveBeenCalledTimes(1);
  });
});
