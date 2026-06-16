import type { LegalSection } from '@/features/legal/components/LegalDocumentScreen';

export const LEGAL_UPDATED_AT = 'June 14, 2026';

export const privacySections: LegalSection[] = [
  {
    title: 'Information Revit Stores',
    body: [
      'Revit stores the profile details you create, including your display name, username, optional bio, and avatar path.',
      'Revit stores your personal journal data, including saved titles, statuses, ratings, short reviews, spoiler flags, completion dates, custom lists, list items, and optional list notes.',
    ],
  },
  {
    title: 'Authentication And Account Data',
    body: [
      'Revit uses Supabase Auth for sign-in. Depending on the method you choose, Supabase may process your email address and identity provider information from Google, Apple, or email magic link authentication.',
      'Authentication tokens are used to keep you signed in and to make sure your private journal, lists, and profile data are only available to your account.',
    ],
  },
  {
    title: 'Avatars And Storage',
    body: [
      'If you upload an avatar, the image is stored in Supabase Storage and linked from your profile. Avatar files are stored in a user-owned folder.',
      'Avatar images may be publicly accessible by direct URL so they can render in the app. Your private journal entries and lists are not made public by avatar storage.',
    ],
  },
  {
    title: 'Media Metadata',
    body: [
      'Revit uses TMDB-sourced metadata for movies, series, and anime. This includes title names, images, release information, descriptions, genres, and related metadata.',
      'Your personal activity, ratings, reviews, and lists are stored separately from the external media metadata.',
    ],
  },
  {
    title: 'How Data Is Used',
    body: [
      'Your data is used to provide the app experience: authentication, profile display, search and title details, journal management, calendar and timeline views, and mixed-media lists.',
      'Revit does not sell your personal journal data. Social features, public profiles, follows, comments, and likes are not part of the v1 product.',
    ],
  },
  {
    title: 'Data Deletion',
    body: [
      'Revit supports in-app account deletion from the Profile account surface.',
      'When account deletion succeeds, Revit removes the authenticated user account and user-owned profile, journal, list, list item, and avatar data.',
    ],
  },
  {
    title: 'Contact',
    body: [
      'For privacy questions or data requests, use the official support contact listed in Revit\'s store listing or distribution page.',
    ],
  },
];

export const termsSections: LegalSection[] = [
  {
    title: 'Use Of Revit',
    body: [
      'Revit is a personal entertainment journal for tracking movies, series, anime, and related lists. You are responsible for the profile details, ratings, reviews, and notes you add.',
      'Do not use Revit to store unlawful, abusive, or harmful content.',
    ],
  },
  {
    title: 'Accounts',
    body: [
      'You need an account to use private journal, list, profile, and avatar features.',
      'You are responsible for keeping access to your sign-in provider secure. If you lose access to your identity provider or email, you may lose access to your Revit account.',
    ],
  },
  {
    title: 'User Content',
    body: [
      'You retain responsibility for reviews, notes, list names, profile details, and avatars you add to Revit.',
      'You should only upload avatar images you have the right to use.',
    ],
  },
  {
    title: 'External Metadata',
    body: [
      'Revit displays third-party entertainment metadata and images from TMDB-backed integrations.',
      'External metadata may be incomplete, delayed, inaccurate, or unavailable. Revit does not guarantee the correctness of third-party title metadata.',
    ],
  },
  {
    title: 'Availability',
    body: [
      'Revit depends on network access, Supabase services, and third-party metadata providers. Some features may be temporarily unavailable during outages, maintenance, or provider failures.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'Revit may update these terms as the app changes. Continued use of the app after an update means you accept the updated terms.',
    ],
  },
];

export const creditsSections: LegalSection[] = [
  {
    title: 'TMDB',
    body: [
      'This product uses the TMDB API but is not endorsed or certified by TMDB.',
      'Movie, series, and anime metadata, poster imagery, backdrop imagery, descriptions, ratings, and related title information may be provided through TMDB-backed integrations.',
    ],
  },
  {
    title: 'Supabase',
    body: [
      'Revit uses Supabase for authentication, Postgres database storage, Storage, and Edge Functions.',
    ],
  },
  {
    title: 'Expo And React Native',
    body: [
      'Revit is built with Expo, React Native, Expo Router, NativeWind, and TanStack Query.',
    ],
  },
  {
    title: 'Open Source Packages',
    body: [
      'Revit depends on open source packages from the JavaScript, React Native, Expo, and Supabase ecosystems. Those packages remain governed by their own licenses.',
    ],
  },
];

export const supportSections: LegalSection[] = [
  {
    title: 'Getting Help',
    body: [
      'Use the official support contact listed in Revit\'s store listing or distribution page.',
      'When reporting an issue, include your device, platform, app version, the screen where the issue happened, and the action you were trying to complete.',
    ],
  },
  {
    title: 'Account And Data Requests',
    body: [
      'For account access, profile, avatar, journal, list, or deletion issues, contact the official support channel for the released app.',
      'Do not send passwords, magic-link codes, OAuth tokens, or private API keys in a support request.',
    ],
  },
  {
    title: 'Metadata Issues',
    body: [
      'If a title has incorrect poster art, description, release information, or genre data, the source metadata may need to be corrected through TMDB.',
    ],
  },
];
