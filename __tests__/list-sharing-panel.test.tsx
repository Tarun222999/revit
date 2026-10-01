import { useState } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Platform, Share } from 'react-native';
import { ListSharingPanel } from '@/features/sharing/components/ListSharingPanel';

const mockManage = jest.fn();
const mockRefetch = jest.fn().mockResolvedValue({});
let mockState = { version: 0, shareKey: null as string | null };
jest.mock('@/features/sharing/hooks/useListSharing', () => ({
  useListSharing: () => ({
    data: mockState,
    refetch: mockRefetch,
    isFetching: false,
    isError: false,
  }),
}));
jest.mock('@/features/sharing/api/list-sharing-api', () => ({
  manageListSharing: (...args: unknown[]) => mockManage(...args),
}));
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
function Panel() {
  const [visible, setVisible] = useState(true);
  return (
    <ListSharingPanel
      listId="list"
      userId="owner"
      visible={visible}
      onClose={() => setVisible(false)}
      onEdit={() => undefined}
      onDelete={() => undefined}
    />
  );
}
beforeEach(() => {
  mockState = { version: 0, shareKey: null };
  mockManage.mockReset();
});

it('shares only the server-created canonical link after closing the menu', async () => {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
  const spy = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.dismissedAction });
  try {
    mockManage.mockResolvedValue({ version: 1, shareKey: 'a'.repeat(64) });
    await render(<Panel />);
    await fireEvent.press(screen.getByLabelText('Share list'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        message: `revit://shared/list/${'a'.repeat(64)}`,
      }),
    );
    expect(mockManage).toHaveBeenCalledWith({
      listId: 'list',
      action: 'share',
      expectedVersion: 0,
    });
    expect(mockManage).toHaveBeenCalledTimes(1);
  } finally {
    spy.mockRestore();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: previous,
    });
  }
});
it('requires explicit stop confirmation and uses the loaded generation', async () => {
  mockState = { version: 3, shareKey: 'a'.repeat(64) };
  mockManage.mockResolvedValue({ version: 4, shareKey: null });
  await render(<Panel />);
  await fireEvent.press(screen.getByText('Stop sharing'));
  expect(mockManage).not.toHaveBeenCalled();
  expect(screen.getByText('Keep sharing')).toBeTruthy();
  await fireEvent.press(screen.getByText('Stop sharing'));
  await waitFor(() =>
    expect(mockManage).toHaveBeenCalledWith({
      listId: 'list',
      action: 'stop',
      expectedVersion: 3,
    }),
  );
});
