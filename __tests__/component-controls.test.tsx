import { fireEvent, render, screen } from '@testing-library/react-native';

import { JournalEntryForm } from '../features/journal/components/JournalEntryForm';
import { JournalStatusSelector } from '../features/journal/components/JournalStatusSelector';
import { RatingInput } from '../features/journal/components/RatingInput';
import { SpoilerToggle } from '../features/journal/components/SpoilerToggle';
import { ListForm, type ListFormValues } from '../features/lists/components/ListForm';
import type { JournalEntryFormValues } from '../features/journal/types';

function makeJournalFormValues(
  overrides: Partial<JournalEntryFormValues> = {},
): JournalEntryFormValues {
  return {
    status: 'completed',
    rating: null,
    reviewHeadline: '',
    reviewBody: '',
    containsSpoilers: false,
    startedOn: null,
    completedOn: '2026-07-13',
    ...overrides,
  };
}

describe('journal controls', () => {
  it('reports a selected journal status', async () => {
    const onChange = jest.fn();

    await render(<JournalStatusSelector value="planned" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Completed' }));

    expect(onChange).toHaveBeenCalledWith('completed');
  });

  it('clears an existing rating', async () => {
    const onChange = jest.fn();

    await render(<RatingInput value={4} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Clear rating' }));

    expect(screen.getByText('4.0 / 5')).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('toggles the spoiler switch and exposes its state', async () => {
    const onChange = jest.fn();

    await render(<SpoilerToggle value={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Contains spoilers' });

    expect(toggle.props.accessibilityState).toEqual({ checked: false });
    await fireEvent.press(toggle);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows planned-only messaging for unreleased titles', async () => {
    await render(
      <JournalEntryForm
        canDelete={false}
        canRateOrReview={false}
        errors={{}}
        isDeleting={false}
        isEditMode={false}
        isSubmitting={false}
        onChange={jest.fn()}
        onDelete={jest.fn()}
        onStatusChange={jest.fn()}
        onSubmit={jest.fn()}
        values={makeJournalFormValues({ status: 'planned', completedOn: null })}
      />,
    );

    expect(screen.getByText('Unreleased titles stay planned until their release date.')).toBeTruthy();
    expect(screen.getByText('Rating and review open after release')).toBeTruthy();
    expect(screen.queryByText('Optional personal score.')).toBeNull();
  });

  it('connects editable journal controls to the form callbacks', async () => {
    const onChange = jest.fn();
    const onStatusChange = jest.fn();

    await render(
      <JournalEntryForm
        canDelete={false}
        canRateOrReview
        errors={{}}
        isDeleting={false}
        isEditMode={false}
        isSubmitting={false}
        onChange={onChange}
        onDelete={jest.fn()}
        onStatusChange={onStatusChange}
        onSubmit={jest.fn()}
        values={makeJournalFormValues()}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'In Progress' }));
    await fireEvent.changeText(
      screen.getByPlaceholderText('Optional short headline'),
      'A useful headline',
    );
    await fireEvent.press(screen.getByRole('switch', { name: 'Contains spoilers' }));

    expect(onStatusChange).toHaveBeenCalledWith('in_progress');
    expect(onChange).toHaveBeenCalledWith('reviewHeadline', 'A useful headline');
    expect(onChange).toHaveBeenCalledWith('containsSpoilers', true);
  });
});

describe('list form component', () => {
  const values: ListFormValues = { name: '', description: '' };

  it('shows validation feedback and submits through callbacks', async () => {
    const onSubmit = jest.fn();

    await render(
      <ListForm
        errors={{ name: 'List name is required.' }}
        hasSubmitted
        isSubmitting={false}
        onCancel={jest.fn()}
        onChange={jest.fn()}
        onSubmit={onSubmit}
        values={values}
      />,
    );

    expect(screen.getByText('List name is required.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Create List' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('reports text input changes to the parent form', async () => {
    const onChange = jest.fn();

    await render(
      <ListForm
        errors={{}}
        isSubmitting={false}
        onCancel={jest.fn()}
        onChange={onChange}
        onSubmit={jest.fn()}
        values={values}
      />,
    );

    await fireEvent.changeText(screen.getByPlaceholderText('Favorites'), 'Watch Next');

    expect(onChange).toHaveBeenCalledWith('name', 'Watch Next');
  });
});
