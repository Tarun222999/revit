import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import CreditsRoute from '@/app/legal/credits';
import PrivacyPolicyRoute from '@/app/legal/privacy';
import SupportRoute from '@/app/support';
import TermsOfUseRoute from '@/app/legal/terms';
import { LEGAL_UPDATED_AT } from '@/features/legal/data/legalDocuments';

jest.mock('expo-linking', () => ({
  openURL: jest.fn().mockResolvedValue(true),
}));

const mockOpenUrl = jest.mocked(Linking.openURL);
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('Games legal and support content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenUrl.mockResolvedValue(true);
  });

  it('discloses server-side IGDB search processing and Revit-owned private game data', async () => {
    await render(<PrivacyPolicyRoute />);

    expect(screen.getByText(`Last updated ${LEGAL_UPDATED_AT}`)).toBeTruthy();
    expect(
      screen.getByText(/processed through Revit's server-side Supabase Edge Functions/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/does not intentionally send your email address, profile identity, private journal or play history/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/private playthrough events, your played-on platform choice/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/removes the live authenticated user account and connected user-owned profile/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/does not promise immediate removal of every storage object version or any backup copy/i),
    ).toBeTruthy();
  });

  it('keeps Games metadata limitations and ownership boundaries in the terms', async () => {
    await render(<TermsOfUseRoute />);

    expect(screen.getByText(/movies, series, anime, games/i)).toBeTruthy();
    expect(
      screen.getByText(/game ratings, release dates, supported platforms, imagery/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/does not prove that you own a game, have it installed/i),
    ).toBeTruthy();
  });

  it('shows permanent, user-visible IGDB attribution with a working external link', async () => {
    await render(<CreditsRoute />);

    expect(screen.getByText('Game metadata and imagery may be provided by IGDB, operated by Twitch.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('link', { name: 'Visit IGDB.com' }));

    expect(mockOpenUrl).toHaveBeenCalledWith('https://www.igdb.com/');
  });

  it('shows a calm alert when the IGDB attribution link cannot open', async () => {
    mockOpenUrl.mockRejectedValueOnce(new Error('No browser available'));

    await render(<CreditsRoute />);
    await fireEvent.press(screen.getByRole('link', { name: 'Visit IGDB.com' }));

    await waitFor(() =>
      expect(mockAlert).toHaveBeenCalledWith(
        'Link unavailable',
        'Unable to open this link right now.',
      ),
    );
  });

  it('routes metadata corrections to their respective providers and keeps secret-safety guidance', async () => {
    await render(<SupportRoute />);

    expect(screen.getByText(/movies, series, or anime/i)).toBeTruthy();
    expect(screen.getByText(/corrected through TMDB/i)).toBeTruthy();
    expect(screen.getByText(/corrected through IGDB/i)).toBeTruthy();
    expect(screen.getByText(/Do not send passwords, magic-link codes, OAuth tokens, or private API keys/i)).toBeTruthy();
  });
});
