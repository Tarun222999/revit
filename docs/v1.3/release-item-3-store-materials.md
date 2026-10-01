# v1.3 release item 3 — Play Store materials

Status: Games-inclusive package approved for the v1.3 PR; Play Console update not yet saved or submitted

This package updates the v1 store-prep draft for the approved v1.3 client.
It does not authorize a Play Console write, release, rollout, or Games
enablement.

## Store listing copy

Category: `Entertainment`

Short description (78 characters):

```text
Track movies, series, anime, and games in your personal entertainment journal.
```

Full description:

```text
Revit is a personal entertainment journal for keeping track of the movies,
series, anime, and games you want to watch or play, are currently enjoying,
and have finished.

Search for titles, save them to your private journal, plan what is next, log
watches or play sessions, give each entry a rating, and keep a personal note.
Browse your history in Timeline, Planner, and Calendar views, then organize
titles into your own mixed-media lists.

With Revit, you can:

- Search movies, series, anime, and video games
- Plan, start, finish, stop, and revisit titles in a private journal
- Record ratings and personal notes for watches and play sessions
- View your journal in Timeline, Planner, and Calendar views
- Build mixed-media lists for collections such as Favorites or Watch Next
- Send a bug report or feature idea from Help & Feedback

Revit is for personal tracking and organization. It does not stream movies or
series, and it does not provide games to play. It has no public social feed.
Title metadata and artwork are used to help you find and organize titles.
```

Release notes:

```text
Version 1.3.0

- Added video game discovery, planning, and journal tracking.
- Added in-app Help & Feedback for bug reports and feature ideas.
- Improved offline startup recovery and loading behavior.
- Refined Discover copy and the Revit Ribbon R branding.
```

Games are included in this listing copy and in the v1.3 release scope. The
production capability was verified as enabled on 14 September 2026. Keep the
listing, screenshot set, hosted policies, and feature flag aligned with the
released client.

## Graphics

The canonical package lives in `publish-store-assets/`:

- `graphics/play-store-icon-512.png`
- `graphics/feature-graphic-1024x500.png`
- `phone-screenshots/01-discover.png`
- `phone-screenshots/02-title-details.png`
- `phone-screenshots/03-journal-timeline.png`
- `phone-screenshots/04-journal-planner.png`
- `phone-screenshots/05-lists.png`
- `phone-screenshots/06-game-details.png`

The Play Store icon is the approved Ribbon R asset, not the legacy icon.
The screenshots have the required dimensions but remain capture-validation
candidates as described in `publish-store-assets/README.md`.

## Data Safety worksheet

Use the following declaration mapping when the exact Play Console form is
open. The final form wording and live production behavior always win.

| Play data type | Collected | Purpose | Required | Shared | Implementation evidence |
| --- | --- | --- | --- | --- | --- |
| Personal info: Name | Yes | App functionality, account management | Required for profile completion | No | Profile display name and username |
| Personal info: Email address | Yes | App functionality, account management | Required for sign-in | No | Google/Supabase Auth account identity |
| Personal info: User IDs | Yes | App functionality, account management | Required | No | Supabase Auth/profile IDs |
| Photos and videos: Photos | Yes | App functionality, account management | Optional | No | Optional avatar picker/upload |
| App activity: User-generated content | Yes | App functionality | Optional by feature | No | Journal events, ratings, notes, lists, list notes, and feedback message |
| App activity: App interactions | Yes | App functionality | Optional | No | Feedback category and app-owned source-screen context |
| App info and performance: Other app performance data | Needs owner confirmation | App functionality if declared | Automatic when feedback is sent | No | Feedback report stores app version/build, platform, and OS version; this is contextual support metadata, not crash or diagnostic telemetry |

Global answers:

- Encryption in transit: `Yes` (HTTPS/TLS).
- Data deletion: `Yes` (in-app account deletion plus support route).
- Account creation: `Yes` for authenticated private features.
- Advertising, sale, analytics, and crash-reporting SDK data: `No`, subject to
  final dependency/manifest verification.
- Device IDs, advertising ID, location, contacts, calendar, microphone/audio,
  financial information, messages, and search history: `No` based on this
  codebase, subject to release-build inspection.

## App content worksheet

- App category: non-game `Entertainment` app. Revit tracks games but is not a
  playable game.
- Ads: `No`.
- In-app purchases / paid digital goods: `No`.
- User-to-user communication: `No`.
- User-generated content visible to other users: `No`; all Journal, list, and
  feedback content is private to its owner and authorized staff processing.
- Public social feed, sharing, or chat: `No`.
- Account required for core private journal/list functionality: `Yes`.
- App access: provide a dedicated Google reviewer account only in Play
  Console's App access form; never add its credentials to the repository.

## Tarun decisions still needed

1. **Feedback metadata declaration:** make the final call with the live Data
   Safety form open on whether stored app version/build/platform/OS context is
   `Other app performance data`. Google describes that type as other *app
   performance* data, while Revit uses the values only as support context; it
   is not crash, diagnostics, or analytics telemetry. The owner should either
   declare it conservatively or document why it does not fit that taxonomy.
2. **Service-provider sharing answer:** confirm how the current Play Console
   defines service-provider processing for Supabase, Google sign-in, and TMDB
   in this release. The worksheet uses `No` for data sharing; change only if
   the live form's definition requires a provider disclosure.
3. **Account creation classification:** the live Data Safety form currently
   has `Other` selected while its description says Google OAuth. Recheck
   whether the form should instead use its dedicated `OAuth` option.
4. **Content rating:** the current rating is all-ages while the target audience
   is 18+. Recheck the IARC answers against dynamic movie, series, anime, and
   game artwork before submitting v1.3.
5. **Reviewer access:** create and test the dedicated Google reviewer account
   for the exact signed release build before entering the App access response.
6. **Hosted evidence:** confirm public Privacy, Terms, and Support pages load
   and accurately reflect the released v1.3 behavior and retention statement.

## Policy references checked on 13 September 2026

- Google Play Data Safety guidance defines collection as data transmitted off
  device, includes SDK/library collection, and exempts processing by a service
  provider from the definition of sharing when that provider processes data on
  the developer's behalf and instruction:
  <https://support.google.com/googleplay/android-developer/answer/10787469>.
- Google defines UGC policy scope as content visible or accessible by at least
  some other users. Revit's private Journal/list/feedback data therefore does
  not create a public-UGC moderation or blocking obligation, but it is still
  declared as collected user-generated content in Data Safety:
  <https://support.google.com/googleplay/android-developer/answer/9876937>.
