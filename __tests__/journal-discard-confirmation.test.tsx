import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { JournalEntryModalScreen } from '@/features/journal/components/JournalEntryModalScreen';

const mockLogEvent = jest.fn();
const mockSavePlan = jest.fn();
const mockUpdateEvent = jest.fn();
let mockMutationPending = false;
let mockPreventRemoveEnabled = false;
let mockPreventRemoveHandler: (() => void) | null = null;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('@react-navigation/native', () => ({
  usePreventRemove: (enabled: boolean, handler: () => void) => {
    mockPreventRemoveEnabled = enabled;
    mockPreventRemoveHandler = handler;
  },
}));
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/features/media/hooks/useMediaDetails', () => ({
  useMediaDetails: () => ({
    data: { item: undefined },
    error: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/features/journal/hooks/useJournalReads', () => ({
  useJournalEvent: () => ({
    data: null,
    error: null,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useJournalTitleSummary: () => ({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: true,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/features/journal/hooks/useJournalLifecycleMutations', () => ({
  useLogJournalEvent: () => ({
    isPending: mockMutationPending,
    mutateAsync: mockLogEvent,
  }),
  useSaveJournalPlan: () => ({
    isPending: mockMutationPending,
    mutateAsync: mockSavePlan,
  }),
  useUpdateJournalEvent: () => ({
    isPending: mockMutationPending,
    mutateAsync: mockUpdateEvent,
  }),
}));
jest.mock('@/features/journal/components/JournalEntryModalFrame', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    JournalEntryModalFrame: ({
      children,
      onClose,
      title,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
      title?: string;
    }) => (
      <View>
        <Text>{title}</Text>
        <Pressable
          accessibilityLabel="Close journal entry modal"
          accessibilityRole="button"
          onPress={onClose}>
          <Text>Close</Text>
        </Pressable>
        {children}
      </View>
    ),
  };
});
jest.mock('@/features/journal/components/JournalIntentForm', () => {
  const { Pressable, Text, TextInput, View } = jest.requireActual('react-native');
  return {
    JournalIntentForm: ({
      isSubmitting,
      onChange,
      onSubmit,
      values,
    }: {
      isSubmitting: boolean;
      onChange: (key: 'notes', value: string) => void;
      onSubmit: () => void;
      values: { notes: string };
    }) => (
      <View>
        <TextInput
          accessibilityLabel="Journal notes"
          editable={!isSubmitting}
          onChangeText={(notes: string) => onChange('notes', notes)}
          value={values.notes}
        />
        <Pressable accessibilityRole="button" onPress={onSubmit}>
          <Text>Save</Text>
        </Pressable>
      </View>
    ),
  };
});

const mockRouter = jest.requireMock('expo-router').router as {
  back: jest.Mock;
  dismissTo: jest.Mock;
};

async function renderJournalForm(returnToJournal = false) {
  return render(
    <JournalEntryModalScreen
      intent="log"
      mediaItemId="media-1"
      returnToJournal={returnToJournal}
      source="title"
    />,
  );
}

async function makeDirty(notes = 'Keep this note') {
  await fireEvent.changeText(screen.getByLabelText('Journal notes'), notes);
}

describe('Journal dirty-form confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutationPending = false;
    mockPreventRemoveEnabled = false;
    mockPreventRemoveHandler = null;
    mockLogEvent.mockResolvedValue(undefined);
    mockSavePlan.mockResolvedValue(undefined);
    mockUpdateEvent.mockResolvedValue(undefined);
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(jest.fn());
    jest
      .spyOn(AccessibilityInfo, 'setAccessibilityFocus')
      .mockImplementation(jest.fn());
  });

  afterEach(() => jest.restoreAllMocks());

  it('closes a clean form immediately without confirmation', async () => {
    await renderJournalForm();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Close journal entry modal' }),
    );

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });

  it('keeps editing with accessible confirmation semantics and retained input', async () => {
    await renderJournalForm();
    await makeDirty();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Close journal entry modal' }),
    );

    expect(screen.getByRole('alert', { name: 'Discard changes?' })).toBeTruthy();
    expect(
      screen.getByText('Your unsaved Journal changes will be lost.'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('journal-discard-confirmation').props
        .accessibilityViewIsModal,
    ).toBe(true);
    expect(
      AccessibilityInfo.announceForAccessibility,
    ).toHaveBeenCalledWith(
      'Discard changes? Your unsaved Journal changes will be lost.',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));

    expect(screen.queryByText('Discard changes?')).toBeNull();
    expect(screen.getByLabelText('Journal notes').props.value).toBe(
      'Keep this note',
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('intercepts navigation once and discards without saving', async () => {
    await renderJournalForm();
    await makeDirty('Discard this note');

    expect(mockPreventRemoveEnabled).toBe(true);
    await act(async () => mockPreventRemoveHandler?.());
    await act(async () => mockPreventRemoveHandler?.());

    expect(screen.getAllByText('Discard changes?')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(mockSavePlan).not.toHaveBeenCalled();
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('treats Android confirmation back as Keep editing', async () => {
    await renderJournalForm();
    await makeDirty('Hardware back note');
    await act(async () => mockPreventRemoveHandler?.());

    const confirmationModal = screen.getByTestId('journal-discard-modal');
    await act(async () => confirmationModal.props.onRequestClose());

    expect(screen.queryByText('Discard changes?')).toBeNull();
    expect(screen.getByLabelText('Journal notes').props.value).toBe(
      'Hardware back note',
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('blocks close and back while submission is pending', async () => {
    mockMutationPending = true;
    await renderJournalForm();

    expect(mockPreventRemoveEnabled).toBe(true);
    await fireEvent.press(
      screen.getByRole('button', { name: 'Close journal entry modal' }),
    );
    await act(async () => mockPreventRemoveHandler?.());

    expect(screen.queryByText('Discard changes?')).toBeNull();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('preserves return-to-Journal behavior for clean navigation dismissal', async () => {
    await renderJournalForm(true);

    expect(mockPreventRemoveEnabled).toBe(true);
    await act(async () => mockPreventRemoveHandler?.());

    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/journal'),
    );
    expect(screen.queryByText('Discard changes?')).toBeNull();
  });
});
