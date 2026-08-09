import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  formatJournalHistoryDate,
  getJournalHistoryEventLabel,
  JournalHistoryRow,
} from '@/features/journal/components/JournalHistoryRow';
import type { JournalEvent } from '@/features/journal/types';

function event(overrides: Partial<JournalEvent> = {}): JournalEvent {
  return {
    eventDate: '2026-08-09',
    id: 'event-1',
    journalEntryId: 'entry-1',
    notes: 'A second viewing.',
    rating: 4,
    type: 'completed',
    ...overrides,
  };
}

describe('Journal history rows', () => {
  it('labels the oldest completion as Watched and newer completions as Rewatched', () => {
    expect(getJournalHistoryEventLabel(event(), 0, 2)).toBe('Rewatched');
    expect(getJournalHistoryEventLabel(event(), 1, 2)).toBe('Watched');
    expect(getJournalHistoryEventLabel(event({ type: 'started' }), -1, 2)).toBe(
      'Started watching',
    );
  });

  it('keeps one compact overflow menu with edit and delete actions', async () => {
    const onDelete = jest.fn();
    const onEdit = jest.fn();
    const onToggleMenu = jest.fn();

    const { rerender } = await render(
      <JournalHistoryRow
        completedCount={2}
        completedIndex={0}
        event={event()}
        menuOpen={false}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleMenu={onToggleMenu}
        pending={false}
      />,
    );

    const trigger = screen.getByLabelText(
      `Show actions for Rewatched on ${formatJournalHistoryDate('2026-08-09')}`,
    );
    expect(trigger.props.accessibilityState).toEqual({ disabled: false, expanded: false });
    await fireEvent.press(trigger);
    expect(onToggleMenu).toHaveBeenCalledTimes(1);

    await rerender(
      <JournalHistoryRow
        completedCount={2}
        completedIndex={0}
        event={event()}
        menuOpen
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleMenu={onToggleMenu}
        pending={false}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Edit watch' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete watch' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
