import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ListsScreen } from '@/features/lists/components/ListsScreen';
import { ListDetailsScreen } from '@/features/lists/components/ListDetailsScreen';
import { ListItemCard } from '@/features/lists/components/ListItemCard';
import type {
  UserListDetails,
  UserListItem,
  UserListSummary,
} from '@/features/lists/types';

const mockPush = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockNote = jest.fn();
const mockRemove = jest.fn();
const mockDelete = jest.fn();
let mockPrevent: { open: boolean; dismiss: () => void };
let mockLists: UserListSummary[];
let mockDetails: UserListDetails;
// Native Pressable dispatches events without awaiting an async application handler.
jest.mock('@/components/ui/Button', () => {
  const { Button } = jest.requireActual('@/components/ui/Button');
  return {
    Button: (props: { onPress?: () => void }) =>
      require('react').createElement(Button, {
        ...props,
        onPress: () => {
          props.onPress?.();
        },
      }),
  };
});
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: jest.fn(),
  },
  Stack: { Screen: () => null },
}));
jest.mock('@react-navigation/native', () => ({
  usePreventRemove: (open: boolean, dismiss: () => void) => {
    if (open) mockPrevent = { open, dismiss };
  },
}));
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'owner' }, loading: false }),
}));
jest.mock('@/features/lists/hooks/useUserLists', () => ({
  useUserLists: () => ({ data: mockLists, isSuccess: true }),
}));
jest.mock('@/features/lists/hooks/useListDetails', () => ({
  useListDetails: () => ({ data: mockDetails, isSuccess: true }),
}));
jest.mock('@/features/lists/hooks/useListMutations', () => ({
  useCreateList: () => ({ isPending: false, mutateAsync: mockCreate }),
  useUpdateList: () => ({ isPending: false, mutateAsync: mockUpdate }),
  useDeleteList: () => ({ isPending: false, mutateAsync: mockDelete }),
  useRemoveListItem: () => ({ isPending: false, mutateAsync: mockRemove }),
  useUpdateListItemNote: () => ({ isPending: false, mutateAsync: mockNote }),
}));
const item: UserListItem = {
  id: 'item',
  listId: 'list',
  mediaItemId: 'media',
  position: null,
  note: null,
  createdAt: '2026-09-27T00:00:00Z',
  media: {
    id: 'media',
    source: 'tmdb',
    sourceId: 'movie:1',
    mediaType: 'movie',
    title: 'Heat',
    year: '1995',
    imageUrl: null,
    backdropUrl: null,
    originalTitle: null,
    releaseDate: null,
    genres: [],
    metadata: {},
  },
};
const summary: UserListSummary = {
  id: 'list',
  userId: 'owner',
  name: 'After hours',
  description: null,
  isDefault: false,
  itemCount: 1,
  coverItems: [],
  createdAt: item.createdAt,
  updatedAt: item.createdAt,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLists = [summary];
  mockDetails = { ...summary, items: [item] };
  mockCreate.mockResolvedValue({ id: 'new' });
  mockUpdate.mockResolvedValue({});
  mockNote.mockResolvedValue({});
});

it('opens normal Search from both populated Add titles and empty Find a title without mutations', async () => {
  const view = await render(<ListDetailsScreen listId="list" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add titles' }));
  expect(mockPush).toHaveBeenLastCalledWith('/search');
  mockDetails = { ...mockDetails, items: [], itemCount: 0 };
  await view.rerender(<ListDetailsScreen listId="list" />);
  expect(screen.queryByLabelText(/Sort titles:/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Find a title' }));
  expect(mockPush.mock.calls).toEqual([['/search'], ['/search']]);
  expect(mockNote).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});

it('creates a list once, preserves failed values, rejects duplicates, and opens new Details', async () => {
  await render(<ListsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'New list' }));
  const fields = screen.getAllByLabelText(/List name|Collection note/);
  await fireEvent.changeText(fields[0], ' AFTER HOURS ');
  await fireEvent.press(screen.getByRole('button', { name: 'Create List' }));
  expect(mockCreate).not.toHaveBeenCalled();
  await fireEvent.changeText(fields[0], 'New collection');
  mockCreate.mockRejectedValueOnce(new Error('Offline'));
  await fireEvent.press(screen.getByRole('button', { name: 'Create List' }));
  await waitFor(() => expect(screen.getByText('Offline')).toBeTruthy());
  expect(
    screen.getAllByLabelText(/List name|Collection note/)[0].props.value,
  ).toBe('New collection');
  let resolve!: (value: { id: string }) => void;
  mockCreate.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Create List' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Create List' }));
  expect(mockCreate).toHaveBeenCalledTimes(2);
  resolve({ id: 'new' });
  await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith('/lists/new'));
});

it('protects dirty metadata through cancel and intercepted navigation and keeps input', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<ListDetailsScreen listId="list" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit list' }));
  await fireEvent.changeText(
    screen.getAllByLabelText(/List name|Collection note/)[0],
    'Edited',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(alert).toHaveBeenCalledWith(
    'Discard changes?',
    expect.any(String),
    expect.any(Array),
    expect.any(Object),
  );
  const keep = alert.mock.calls[0][2]![0];
  keep.onPress!();
  mockPrevent.dismiss();
  expect(alert).toHaveBeenCalledTimes(2);
  expect(
    screen.getAllByLabelText(/List name|Collection note/)[0].props.value,
  ).toBe('Edited');
  expect(mockUpdate).not.toHaveBeenCalled();
  alert.mockRestore();
});

it('retains a failed note, retries the same text, and clears it to null on successful save', async () => {
  const save = jest
    .fn()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(undefined);
  await render(
    <ListItemCard
      item={item}
      onPress={jest.fn()}
      onRemove={jest.fn()}
      onSaveNote={save}
    />,
  );
  await fireEvent.press(screen.getByLabelText('Add note for Heat'));
  await fireEvent.changeText(
    screen.getAllByLabelText(/List name|Collection note/)[0],
    'Keep this text',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save note' }));
  await waitFor(() => expect(screen.getByText('Offline')).toBeTruthy());
  expect(
    screen.getAllByLabelText(/List name|Collection note/)[0].props.value,
  ).toBe('Keep this text');
  await fireEvent.press(screen.getByRole('button', { name: 'Save note' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Save note' })).toBeNull(),
  );
  expect(save.mock.calls).toEqual([['Keep this text'], ['Keep this text']]);
  await fireEvent.press(screen.getByLabelText('Add note for Heat'));
  await fireEvent.changeText(
    screen.getAllByLabelText(/List name|Collection note/)[0],
    '   ',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save note' }));
  await waitFor(() => expect(save).toHaveBeenLastCalledWith(null));
});

it('keeps item removal behind options and confirms its limited scope', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(
    <ListItemCard
      item={item}
      onPress={jest.fn()}
      onRemove={mockRemove}
      onSaveNote={mockNote}
    />,
  );
  expect(screen.queryByText('Remove from this list')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Options for Heat'));
  await fireEvent.press(
    screen.getByRole('button', { name: 'Remove from this list' }),
  );
  expect(mockRemove).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][1]).toContain(
    'Your Journal and other lists stay as they are.',
  );
  alert.mock.calls[0][2]![1].onPress!();
  expect(mockRemove).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});
