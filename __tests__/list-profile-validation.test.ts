import {
  getVisibleListFormErrors,
  validateListForm,
  type ListFormErrors,
} from '../features/lists/components/ListForm';
import {
  getProfileErrorMessage,
  isDuplicateProfileError,
} from '../features/profile/utils/profileErrors';
import {
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from '../features/profile/api/profile-api';

describe('list form validation', () => {
  it('accepts trimmed names and descriptions within limits', () => {
    expect(
      validateListForm({ name: '  Favorites  ', description: 'A short list' }),
    ).toEqual({});
  });

  it('requires a non-blank list name', () => {
    expect(validateListForm({ name: '   ', description: '' })).toEqual({
      name: 'List name is required.',
    });
  });

  it('rejects list fields above their limits', () => {
    expect(
      validateListForm({
        name: 'n'.repeat(81),
        description: 'd'.repeat(281),
      }),
    ).toEqual({
      description: 'Description must be 280 characters or fewer.',
      name: 'List name must be 80 characters or fewer.',
    });
  });

  it('only shows touched validation errors before submission', () => {
    const errors: ListFormErrors = {
      description: 'Description error',
      name: 'Name error',
    };

    expect(getVisibleListFormErrors(errors, { name: true }, false)).toEqual({
      name: 'Name error',
    });
    expect(getVisibleListFormErrors(errors, {}, false)).toEqual({});
    expect(getVisibleListFormErrors(errors, {}, true)).toEqual(errors);
  });
});

describe('profile validation and errors', () => {
  it('normalizes usernames before persistence', () => {
    expect(normalizeUsername('  Movie_Fan  ')).toBe('movie_fan');
  });

  it('validates username format and length', () => {
    expect(validateUsername('')).toBe('Choose a username.');
    expect(validateUsername('ab')).toBe(
      'Use 3-24 lowercase letters, numbers, or underscores.',
    );
    expect(validateUsername('movie-fan')).toBe(
      'Use 3-24 lowercase letters, numbers, or underscores.',
    );
    expect(validateUsername('Movie_Fan')).toBeNull();
    expect(validateUsername('valid_user_24_chars')).toBeNull();
  });

  it('validates display names', () => {
    expect(validateDisplayName('   ')).toBe('Add a display name.');
    expect(validateDisplayName('d'.repeat(81))).toBe(
      'Display name must be 80 characters or fewer.',
    );
    expect(validateDisplayName('Tarun')).toBeNull();
  });

  it('maps profile errors and detects duplicate usernames', () => {
    expect(getProfileErrorMessage(new Error('Profile failed'), 'Fallback')).toBe(
      'Profile failed',
    );
    expect(getProfileErrorMessage('unknown', 'Fallback')).toBe('Fallback');
    expect(isDuplicateProfileError(new Error('duplicate key value'))).toBe(true);
    expect(isDuplicateProfileError({ code: '23505' })).toBe(false);
    expect(isDuplicateProfileError('Postgres error 23505')).toBe(true);
    expect(isDuplicateProfileError('network error')).toBe(false);
  });
});
