import { fireEvent, render, screen } from '@testing-library/react-native';

import { JournalTimelineFilters } from '@/features/journal/components/JournalTimelineFilters';
import { DEFAULT_TIMELINE_FILTERS } from '@/features/journal/model/journalTimeline';

describe('Journal timeline filter sheet', () => {
  it('keeps Clear all open and applies selections only when requested', async () => {
    const onChange = jest.fn();

    await render(
      <JournalTimelineFilters
        filters={DEFAULT_TIMELINE_FILTERS}
        onChange={onChange}
        resultCount={3}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Filter' }));
    expect(screen.getByText('Filter Timeline')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByText('Filter Timeline')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Apply filters' }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_TIMELINE_FILTERS);
    expect(screen.queryByText('Filter Timeline')).toBeNull();
  });
});
