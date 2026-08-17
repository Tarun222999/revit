import { fireEvent, render, screen } from '@testing-library/react-native';

import { JournalEntryForm } from '../features/journal/components/JournalEntryForm';
import { JournalStatusSelector } from '../features/journal/components/JournalStatusSelector';
import { RatingInput } from '../features/journal/components/RatingInput';
import { SpoilerToggle } from '../features/journal/components/SpoilerToggle';
import { TitleDetailsJournalActions } from '../features/journal/components/TitleDetailsJournalActions';
import { JournalActionConfirmation } from '../features/journal/components/JournalActionConfirmation';
import { YourJournalSummary } from '../features/journal/components/YourJournalSummary';
import { ListForm, type ListFormValues } from '../features/lists/components/ListForm';
import { TitleDetailsHero } from '../features/media/components/TitleDetailsHero';
import { TitleDetailsMetadataCard } from '../features/media/components/TitleDetailsMetadataCard';
import { TitleDetailsSummaryCard } from '../features/media/components/TitleDetailsSummaryCard';
import type { JournalEntryFormValues } from '../features/journal/types';
import type { NormalizedMediaItem } from '../types/media';

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
  it('offers signed-out users a working Journal sign-in action', async () => {
    const onSignIn = jest.fn();

    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList={false}
        canUseJournal={false}
        isSignedIn={false}
        mediaType="movie"
        onAddToList={jest.fn()}
        onIntent={jest.fn()}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={onSignIn}
        onWatchTrailer={jest.fn()}
        removing={false}
        showTrailer={false}
        summary={null}
      />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Sign in to use Journal' }),
    );

    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

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

describe('title details hero', () => {
  const mediaItem = {
    backdropUrl: 'https://example.com/backdrop.jpg',
    genres: ['Drama'],
    mediaType: 'movie',
    metadata: { runtime: 142, voteAverage: 4.3 },
    source: 'tmdb',
    sourceId: 'movie:278',
    title: 'The Shawshank Redemption',
  } satisfies NormalizedMediaItem;

  it('uses the backdrop, compact metadata, and TMDB rating in the hero', async () => {
    await render(<TitleDetailsHero item={mediaItem} />);

    expect(screen.getByTestId('title-backdrop-image')).toBeTruthy();
    expect(screen.getByText('2h 22m · Drama')).toBeTruthy();
    expect(screen.getByText('4.3 TMDB')).toBeTruthy();
  });

  it('keeps the hero composition when the backdrop fails', async () => {
    await render(<TitleDetailsHero item={mediaItem} />);
    await fireEvent(screen.getByTestId('title-backdrop-image'), 'error', {
      nativeEvent: { error: 'Unable to load artwork.' },
    });

    expect(screen.getByTestId('title-backdrop-fallback')).toBeTruthy();
    expect(screen.getByText('The Shawshank Redemption')).toBeTruthy();
  });
});

describe('cinematic title-detail controls', () => {
  it('exposes only Remove plan for a plan-only title', async () => {
    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList={false}
        canUseJournal
        isSignedIn
        mediaType="movie"
        onAddToList={jest.fn()}
        onIntent={jest.fn()}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={jest.fn()}
        onWatchTrailer={jest.fn()}
        removing={false}
        showTrailer={false}
        summary={{
          activityCount: 0,
          completedWatchCount: 0,
          latestCompletedEvent: null,
          titleState: {
            activePlan: { plannedFor: null },
            id: 'entry-1',
            mediaItemId: 'media-1',
            status: 'planned',
            undatedCompletedCount: 0,
          },
        }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByText('Remove plan')).toBeTruthy();
    expect(screen.queryByText('Remove from Journal')).toBeNull();
  });

  it('hides More when an untracked movie has no additional actions', async () => {
    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList={false}
        canUseJournal
        isSignedIn
        mediaType="movie"
        onAddToList={jest.fn()}
        onIntent={jest.fn()}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={jest.fn()}
        onWatchTrailer={jest.fn()}
        removing={false}
        showTrailer={false}
        summary={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
  });

  it('supports a non-destructive primary confirmation action', async () => {
    const onConfirm = jest.fn();
    await render(
      <JournalActionConfirmation
        body="Check the provider date."
        confirmLabel="Log watch"
        confirmVariant="primary"
        onCancel={jest.fn()}
        onConfirm={onConfirm}
        title="Check the release date"
        visible
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Log watch' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps trailer and list controls compact beside one Journal action', async () => {
    const onWatchTrailer = jest.fn();

    await render(
      <TitleDetailsJournalActions
        addToListLoading={false}
        canAddToList
        canUseJournal
        isSignedIn
        mediaType="movie"
        onAddToList={jest.fn()}
        onIntent={jest.fn()}
        onRemovePlan={jest.fn()}
        onRemoveTitle={jest.fn()}
        onSignIn={jest.fn()}
        onWatchTrailer={onWatchTrailer}
        removing={false}
        showTrailer
        summary={null}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Watch trailer' }));

    expect(screen.getByRole('button', { name: 'Log a watch' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to List' })).toBeTruthy();
    expect(onWatchTrailer).toHaveBeenCalledTimes(1);
  });

  it('expands the story without changing the main action controls', async () => {
    const description = 'A long story. '.repeat(30);

    await render(<TitleDetailsSummaryCard description={description} />);
    const readMore = screen.getByRole('button', { name: 'Read more of the story' });

    expect(readMore.props.accessibilityState).toEqual({ expanded: false });
    await fireEvent.press(readMore);

    expect(screen.getByRole('button', { name: 'Show less of the story' })).toBeTruthy();
  });

  it('discloses secondary details progressively', async () => {
    await render(
      <TitleDetailsMetadataCard
        details={[
          { label: 'Released', value: '14 October 1994' },
          { label: 'Runtime', value: '142m' },
          { label: 'Studio', value: 'Castle Rock' },
          { label: 'Language', value: 'English' },
        ]}
      />,
    );

    expect(screen.queryByText('Castle Rock')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show 2 more title details' }));

    expect(screen.getByText('Castle Rock')).toBeTruthy();
  });

  it('shows one remaining detail without an unnecessary disclosure control', async () => {
    await render(
      <TitleDetailsMetadataCard
        details={[
          { label: 'Released', value: '14 October 1994' },
          { label: 'Runtime', value: '142m' },
          { label: 'Studio', value: 'Castle Rock' },
        ]}
      />,
    );

    expect(screen.getByText('Castle Rock')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /more title details/ })).toBeNull();
  });

  it('opens history through the compact Your Journal strip when activity exists', async () => {
    const onPress = jest.fn();

    await render(
      <YourJournalSummary
        onPress={onPress}
        summary={{
          activityCount: 1,
          completedWatchCount: 1,
          latestCompletedEvent: {
            eventDate: '2026-08-10',
            id: 'event-1',
            journalEntryId: 'entry-1',
            notes: 'Still excellent.',
            rating: 4.5,
            type: 'completed',
          },
          titleState: {
            activePlan: null,
            id: 'entry-1',
            mediaItemId: 'media-1',
            status: 'completed',
            undatedCompletedCount: 0,
          },
        }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: /Your Journal\. Latest watch/ }));

    expect(screen.getByText('1 watch')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
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
