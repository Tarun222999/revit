# Phase 1 Auth And App Shell

## Purpose

This document expands the Phase 1 section from `docs/feature-plan.md` into a detailed implementation plan.

Phase 1 is the first real product feature phase. Its job is to turn the Phase 0 route skeleton into a usable authenticated app shell with production-oriented Supabase Auth flows, onboarding, profile persistence, session handling, and protected routing.

This phase should make it possible for a user to sign in, create an app profile, and land inside the tab shell. It should not start the TMDB, journal, list, or title-detail product work yet.

## Phase Goal

Implement Auth and App Shell.

By the end of Phase 1:

- unauthenticated users should land in the auth flow
- users should be able to continue with Email OTP / magic link
- users should be able to continue with Google
- iOS users should be able to continue with Apple
- signed-in users without a profile should complete onboarding
- profile data should persist in Supabase
- signed-in users with a profile should land in the app tabs
- app tabs should be protected from unauthenticated access
- auth screens should be hidden from fully onboarded users
- the tab shell should include a top-right avatar/profile action
- Profile should remain a pushed screen, not a bottom tab
- sign out should be minimally available for auth testing

## Non-Goals

Do not build unrelated product features in Phase 1.

Specifically, do not implement:

- TMDB integration
- Supabase Edge Functions for TMDB
- search results
- title details
- journal CRUD
- add/edit journal entry behavior
- journal timeline logic
- journal calendar logic
- lists CRUD
- profile stats
- profile taste summaries
- full settings
- connected accounts management UI
- account deletion
- production legal pages
- release build setup

Small identity-focused Profile changes and a minimal sign-out path are acceptable only because they support auth testing and the app shell.

## Current Starting Point From Phase 0

Phase 0 is complete and left the app in this state:

- Expo React Native TypeScript app scaffolded.
- Expo Router configured.
- Root route currently redirects to `/home`.
- Auth routes exist under the pathless `(auth)` group.
- Auth entry route is `/welcome`, not `/(auth)/index`, to avoid root route conflicts.
- Bottom tabs are Home, Search, Journal, and Lists.
- Profile is not a tab.
- Profile exists as a pushed screen at `/profile`.
- Settings exists as a pushed screen at `/settings`.
- Add/Edit Journal Entry exists as a modal route placeholder.
- NativeWind is configured.
- Theme direction is `Refined Collector Shelf`: dark archive base, warm shelf/gold accents, poster-friendly collector/journal feel.
- TanStack Query is configured in `lib/query`.
- Supabase client wiring exists in `lib/supabase`.
- `.env.example` and `docs/environment.md` exist.
- Base folder structure exists.
- Shared UI primitives exist.
- Feature placeholder screens exist.
- Project scripts exist.

Current useful commands:

```text
npm start
npm run typecheck
npm run lint
npm run doctor
npm run check
npm run export:web
```

Phase 0 final verification:

- `npm run check` passed.
- `npm run export:web` passed.
- Expo Go opens cleanly.
- No known current runtime issue.

## Locked Product And Technical Direction

Phase 1 must follow the locked stack:

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind
- TanStack Query
- Supabase Auth
- Supabase Postgres
- SQL migrations
- generated Supabase database types

Phase 1 must follow the locked auth model:

- Google login
- Sign in with Apple on iOS
- Email OTP / magic link
- no email/password-first flow

Phase 1 must keep the locked navigation model:

- Home, Search, Journal, and Lists are bottom tabs
- Profile is accessed from the top-right avatar/profile action
- Profile is not a tab
- Add/Edit Journal Entry remains a modal flow
- auth entry route remains `/welcome`

Phase 1 should preserve the current visual direction:

- dark archive base
- warm shelf/gold accents
- refined collector/journal feel
- app-specific UI, not a stock component-library identity

## Supabase Setup Prerequisites

Create and configure the Supabase project before implementing Phase 1 auth code.

### 1. Environment Values

Local `.env` should contain real Supabase values:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

These are public client values. Do not add private service role keys, TMDB keys, future IGDB credentials, or webhook secrets to Expo public variables.

### 2. Profiles Table Migration

Phase 1 should add the first real SQL migration for app profile persistence.

Recommended table:

```text
profiles
  id uuid primary key references auth.users(id) on delete cascade
  username text unique not null
  display_name text not null
  avatar_path text null
  bio text null
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Recommended constraints:

- username is unique
- username is lowercase, URL-safe, and stable enough for future profile URLs
- display name is required
- bio remains nullable because profile editing is not the focus of Phase 1

Recommended username rule:

```text
3 to 24 characters, lowercase letters, numbers, and underscores
```

Recommended RLS policies:

- users can insert their own profile where `id = auth.uid()`
- users can select their own profile
- users can update their own profile
- users cannot manage another user's profile

Do not create broad public profile visibility in Phase 1. Public profiles and social visibility are deferred.

### 3. Updated-At Handling

Add a simple `updated_at` trigger for `profiles`.

This keeps app code from needing to manually manage profile timestamps.

### 4. Generated Database Types

After applying the migration, update `lib/supabase/types.ts` from generated Supabase database types.

If local type generation is blocked by missing Supabase CLI configuration, call that out before implementing code that depends on generated table types. Avoid drifting into long-term hand-written database types.

### 5. Avatar Storage

The `profiles.avatar_path` column should exist in Phase 1.

Full avatar upload can stay minimal:

- acceptable Phase 1 baseline: nullable `avatar_path`, initials fallback, and profile persistence
- optional Phase 1 enhancement: configure an `avatars` Storage bucket and upload an onboarding-selected image

If avatar upload is implemented, add Storage policies that only allow users to manage their own avatar objects.

Do not build the full settings avatar-management flow in Phase 1.

### 6. Redirect URLs And Deep Links

The app already has this Expo scheme in `app.json`:

```text
revit
```

Add a centralized redirect URL helper instead of hardcoding redirect strings in every auth hook.

The helper should use Expo Linking so development, Expo Go, web, and future native builds can produce the right callback URL.

Expected redirect target:

```text
/callback
```

Supabase Auth redirect allow-list should include the generated development callback URL and the production app-scheme callback URL.

Examples to account for:

- Expo Go development URL generated by `Linking.createURL('/callback')`
- native scheme URL for installed builds using the `revit` scheme
- local web callback URL if testing auth on web

## Auth Provider Setup Notes

### Email OTP / Magic Link

Use Supabase email auth, not email/password.

Expected app behavior:

- user enters email on the Email Code screen
- app requests OTP / magic link with `supabase.auth.signInWithOtp`
- screen shows a code input after send
- user can verify a code with `supabase.auth.verifyOtp`
- magic link callback should also be handled through the auth callback route
- resend should be available after the initial send
- validation and loading states should be clear

Supabase email template should support the chosen app flow.

Preferred UX for Phase 1:

- keep one Email Code screen
- do not create separate Sign In, Sign Up, and Forgot Password screens
- support both code entry and magic-link return where practical

### Google Auth

Use Supabase OAuth for Google.

Expected app behavior:

- Welcome screen has `Continue with Google`
- app starts the Supabase OAuth flow
- browser session opens through Expo-compatible browser handling
- callback route exchanges the returned auth code for a Supabase session
- successful auth routes the user to onboarding or the app shell depending on profile state

Implementation direction:

- use `supabase.auth.signInWithOAuth`
- use Expo browser/deep-link handling
- keep OAuth redirect URL generation centralized
- do not store Google tokens manually

### Apple Auth On iOS

Use Sign in with Apple on iOS.

Expected app behavior:

- Apple button appears on iOS only
- Apple button is hidden or disabled gracefully on Android and unsupported platforms
- successful Apple auth creates a Supabase session
- users route through the same onboarding/profile checks as other providers

Implementation direction:

- add the Expo Apple Authentication package during implementation
- use Supabase's Apple identity token flow
- preserve platform checks so Android does not show a broken Apple action

Note:

- Apple auth may require a real iOS device, simulator support, and Apple Developer configuration before final manual verification.

### Sign Out

Phase 1 can add a minimal sign-out path for testing.

Acceptable placement:

- Profile screen, because Profile is reachable from the tab shell
- Settings placeholder, if Settings remains reachable from Profile

Expected behavior:

- calls `supabase.auth.signOut`
- clears auth/profile query state
- returns the user to `/welcome`

Do not build full settings/account management in Phase 1.

## Route Structure Changes

Current Phase 0 route shape:

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
    welcome.tsx
    email-code.tsx
    onboarding.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    home.tsx
    search.tsx
    journal.tsx
    lists.tsx
  title/
    [id].tsx
  lists/
    [id].tsx
  profile.tsx
  settings.tsx
  modals/
    journal-entry.tsx
```

Target Phase 1 route shape:

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
    _layout.tsx
    welcome.tsx
    email-code.tsx
    onboarding.tsx
    callback.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    home.tsx
    search.tsx
    journal.tsx
    lists.tsx
  title/
    [id].tsx
  lists/
    [id].tsx
  profile.tsx
  settings.tsx
  modals/
    journal-entry.tsx
```

Important routing decisions:

- Keep `/welcome` as the auth entry route.
- Do not add `app/(auth)/index.tsx`.
- Use `app/index.tsx` only as a root redirect/entry coordinator.
- Add a callback route for OAuth and magic-link returns.
- Protect `(tabs)`, Profile, Settings, details, and modal routes behind auth.
- Route signed-in users without profiles to `/onboarding`.
- Route signed-in users with profiles away from auth screens and into `/home`.

## App Shell And Header Plan

The app shell should keep the Phase 0 bottom tab decisions:

- Home
- Search
- Journal
- Lists

Profile remains a pushed screen:

```text
/profile
```

### Top-Right Avatar/Profile Action

Add a shared top-right avatar/profile action to the authenticated app shell.

Expected behavior:

- visible in the tab shell
- uses the current profile avatar when available
- falls back to initials or a simple avatar mark
- navigates to `/profile`
- does not create a fifth Profile tab

Implementation options:

- configure tab headers in `app/(tabs)/_layout.tsx`
- extract a small profile action component if the header logic becomes noisy

Recommended file:

```text
features/profile/components/ProfileAvatarAction.tsx
```

### Header Styling

Header styling should match the current theme direction:

- archive/dark surface
- warm gold active accents
- readable muted text
- no large marketing hero treatment inside the app shell

Home can still include a greeting inside the Home screen later, but Phase 1 does not need to build the full Discover/Dashboard experience.

## Session Handling Approach

Add a central auth/session layer around the app.

Recommended responsibilities:

- load the initial Supabase session
- subscribe to `supabase.auth.onAuthStateChange`
- expose the current user/session
- fetch the current app profile after session load
- expose loading, authenticated, and onboarded states
- provide sign-out
- clear relevant TanStack Query cache on sign-out

Recommended structure:

```text
features/auth/
  components/
    AuthGate.tsx
  context/
    AuthProvider.tsx
  hooks/
    useAuth.ts
```

Root app wiring:

- keep `QueryProvider` at the root
- add `AuthProvider` inside or alongside query provider
- add `AuthGate` where it can safely redirect after navigation is ready

Redirect rules:

1. While auth state is loading, show a calm loading screen.
2. If there is no session, allow only auth routes and send other routes to `/welcome`.
3. If there is a session and no profile, send the user to `/onboarding`.
4. If there is a session and a profile, send auth routes to `/home`.
5. Allow the callback route to finish session exchange before profile redirects run.

Avoid flicker by waiting for initial session and profile checks before redirecting.

## Onboarding And Profile Persistence Approach

The onboarding screen should create the app-level profile row after Supabase Auth has created the auth user.

### Form Fields

Required:

- display name
- username

Optional:

- avatar

Stored but not emphasized in Phase 1:

- `bio` can remain null

### Validation

Display name:

- required
- trimmed
- reasonable max length

Username:

- required
- trimmed
- converted to lowercase
- 3 to 24 characters
- lowercase letters, numbers, and underscores only
- show a friendly error when the unique username constraint fails

Avatar:

- optional
- use fallback initials if not present
- upload only if the Storage bucket and policies are ready

### Persistence

Create a profile row with:

```text
id = auth.uid()
username
display_name
avatar_path = nullable
bio = nullable
```

Use a feature-owned profile API helper instead of putting Supabase calls directly inside the route file.

Recommended files:

```text
features/profile/api/profile-api.ts
features/profile/hooks/useCurrentProfile.ts
features/profile/hooks/useCreateProfile.ts
```

After profile creation:

- refresh/invalidate the current profile query
- route to `/home`
- keep tab shell protected

If a signed-in user already has a profile:

- skip onboarding
- route to the app shell

## Expected Files

Likely new files:

```text
app/(auth)/callback.tsx
features/auth/components/AuthCallbackScreen.tsx
features/auth/components/AuthGate.tsx
features/auth/context/AuthProvider.tsx
features/auth/hooks/useAuth.ts
features/auth/hooks/useAppleSignIn.ts
features/auth/hooks/useEmailOtp.ts
features/auth/hooks/useGoogleSignIn.ts
features/auth/utils/authRedirect.ts
features/profile/api/profile-api.ts
features/profile/hooks/useCreateProfile.ts
features/profile/hooks/useCurrentProfile.ts
features/profile/components/ProfileAvatarAction.tsx
supabase/migrations/<timestamp>_create_profiles.sql
```

Likely updated files:

```text
app/_layout.tsx
app/index.tsx
app/(auth)/_layout.tsx
app/(auth)/welcome.tsx
app/(auth)/email-code.tsx
app/(auth)/onboarding.tsx
app/(tabs)/_layout.tsx
app/profile.tsx
features/auth/components/WelcomeAuthScreen.tsx
features/auth/components/EmailCodeScreen.tsx
features/auth/components/OnboardingScreen.tsx
features/profile/components/ProfileScreen.tsx
lib/supabase/auth.ts
lib/supabase/types.ts
docs/environment.md
.env.example
package.json
package-lock.json
```

Possible dependency additions:

```text
expo-apple-authentication
```

Only add more packages when the selected Supabase/Expo auth implementation requires them.

## Implementation Sequence

### 1. Confirm Supabase Environment

Before auth implementation, confirm the local `.env` has real Supabase project values.

Expected outcome:
- Supabase client can connect to the intended project
- no service role key is present in mobile environment variables
- `docs/environment.md` remains accurate

### 2. Add Profiles Migration And RLS

Create the `profiles` table migration.

Expected outcome:

- table exists
- constraints exist
- `updated_at` trigger exists
- RLS is enabled
- own-profile insert/select/update policies exist

### 3. Update Generated Database Types

Generate or update Supabase database types after migration.

Expected outcome:

- `lib/supabase/types.ts` includes `profiles`
- profile API helpers use typed table access

### 4. Add Auth Redirect Utilities

Create a helper for callback URLs and OAuth exchange handling.

Expected outcome:

- Email, Google, and callback route use one redirect URL strategy
- future auth provider changes do not require scattered redirect edits

### 5. Add Auth Provider And Session Hook

Create the central auth context/hook.

Expected outcome:

- initial session loads once
- auth changes update app state
- sign-out is exposed
- query cache handling is predictable

### 6. Add Protected Routing

Add the route guard behavior.

Expected outcome:

- unauthenticated users cannot enter app tabs by direct route
- signed-in users without profiles go to onboarding
- fully onboarded users do not remain on auth screens
- auth callback can finish before redirects compete with it

### 7. Build Welcome/Auth Screen

Replace the Phase 0 placeholder with a real Welcome/Auth screen.

Expected outcome:

- app name and tagline are shown
- Google action exists
- Apple action appears on iOS only
- Email action navigates to `/email-code`
- footer links can remain present but not fully implemented
- UI follows the Refined Collector Shelf direction

### 8. Build Email OTP / Magic Link Flow

Replace the Email Code placeholder with a working form.

Expected outcome:

- email entry validates basic email shape
- send code action calls Supabase
- code verification works when configured
- resend path exists
- loading and error states are shown

### 9. Add Google Auth

Wire the Google button through Supabase OAuth.

Expected outcome:

- OAuth browser opens
- callback returns to the app
- Supabase session is established
- route guard sends user to onboarding or app shell

### 10. Add Apple Auth On iOS

Wire Sign in with Apple for iOS.

Expected outcome:

- Apple button is available only when supported
- successful Apple auth creates a Supabase session
- unsupported platforms do not show a broken flow

### 11. Build Onboarding/Create Profile Screen

Replace the onboarding placeholder with a profile form.

Expected outcome:

- display name and username are required
- validation is clear
- profile insert works under RLS
- duplicate username error is friendly
- success routes to `/home`

### 12. Add App Shell Avatar/Profile Action

Add the top-right avatar/profile action in the authenticated shell.

Expected outcome:

- action appears in the tab shell
- tapping it pushes `/profile`
- no Profile tab is added
- fallback avatar works before avatar upload exists

### 13. Add Minimal Profile Identity And Sign Out

Update the Profile screen only enough to support Phase 1 auth testing.

Expected outcome:

- display name and username show from Supabase profile
- sign-out action exists
- sign-out returns to `/welcome`
- no stats or profile summary sections are built yet

### 14. Update Environment Docs

Update `docs/environment.md` and `.env.example` if Phase 1 introduces new public values or redirect setup notes.

Expected outcome:

- future agents know how to configure Supabase Auth locally
- private secrets remain out of the mobile app

### 15. Verify The Phase

Run automated checks and manual auth checks.

Expected outcome:

- TypeScript passes
- lint passes
- Expo dependency check passes
- web export still passes if supported by the auth dependencies
- Expo Go or a dev build can complete the supported auth flows

## Acceptance Criteria

Phase 1 is complete when:

1. Unauthenticated users land on `/welcome`.
2. Direct navigation to app tabs redirects unauthenticated users to `/welcome`.
3. Welcome/Auth screen shows Google, Email, and iOS-only Apple auth actions.
4. Email OTP / magic-link flow can create or resume a Supabase Auth session.
5. Google auth can create or resume a Supabase Auth session.
6. Apple auth is implemented for iOS and hidden or safely unavailable elsewhere.
7. Signed-in users without a profile are routed to `/onboarding`.
8. Onboarding creates a `profiles` row in Supabase.
9. Profile creation respects RLS and only writes the current user's profile.
10. Duplicate usernames show a friendly user-facing error.
11. Signed-in users with profiles are routed to `/home`.
12. Fully onboarded users are redirected away from auth screens.
13. Bottom tabs remain Home, Search, Journal, and Lists only.
14. Profile is reachable from a top-right avatar/profile action.
15. Profile is still a pushed screen, not a tab.
16. Minimal sign-out works and returns to `/welcome`.
17. `npm run typecheck` passes.
18. `npm run lint` passes.
19. `npm run doctor` passes.
20. `npm run export:web` passes or any auth-package limitation is documented clearly.
21. No TMDB, search results, title details, journal CRUD, or lists CRUD are introduced.

## Verification Checklist

### Automated

Run:

```text
npm run typecheck
npm run lint
npm run doctor
npm run check
npm run export:web
```

### Supabase

Verify:

- migration applies cleanly
- `profiles` table exists
- RLS is enabled on `profiles`
- current user can insert own profile
- current user can select own profile
- current user can update own profile
- current user cannot select or update another user's profile
- generated TypeScript database types include `profiles`

### Email Auth

Verify:

- valid email can request OTP / magic link
- invalid email shows validation
- resend works
- correct OTP verifies when Supabase email template supports token entry
- magic link returns to the app callback route
- failed verification shows a calm error

### Google Auth

Verify:

- Google provider is configured in Supabase
- Google action opens the browser auth session
- callback returns to the app
- Supabase session is established
- new users go to onboarding
- returning users with profiles go to `/home`

### Apple Auth

Verify on iOS:

- Apple provider is configured in Supabase
- Apple button appears only when supported
- Apple auth creates a Supabase session
- new users go to onboarding
- returning users with profiles go to `/home`

Verify on non-iOS platforms:

- Apple action is hidden or safely unavailable

### Routing

Verify:

- `/` resolves through the auth-aware entry flow
- `/welcome` remains the auth entry route
- there is no root conflict with `(auth)/index`
- unauthenticated access to `/home`, `/search`, `/journal`, `/lists`, `/profile`, and `/settings` redirects to `/welcome`
- signed-in users without profiles go to `/onboarding`
- signed-in users with profiles go to `/home`
- callback route does not get interrupted by guard redirects

### App Shell

Verify:

- bottom tabs remain Home, Search, Journal, and Lists
- top-right avatar/profile action appears in the app shell
- avatar action pushes `/profile`
- Profile screen can show current profile identity
- sign out clears the session and routes back to `/welcome`

### Visual And UX

Verify:

- auth screens match the Refined Collector Shelf direction
- touch targets are comfortable
- loading states are visible
- disabled states are clear
- errors are concise and actionable
- no screen depends on TMDB or journal/list data

## Risks And Decisions To Watch

### Deep Link Differences

Expo Go, web, and native builds can produce different redirect URLs.

Decision:

- centralize redirect URL generation
- document the exact URLs used during local verification
- configure Supabase redirect allow-list accordingly

### Apple Auth Configuration

Sign in with Apple may require Apple Developer setup and iOS-specific testing.

Decision:

- implement the code path in Phase 1
- hide unsupported platform UI
- document any provider setup that cannot be verified locally

### Email OTP Template Behavior

Supabase email templates can be configured for magic links, OTP codes, or both.

Decision:

- keep the app screen capable of code verification
- handle magic-link callback
- document the required Supabase template setup

### Username Uniqueness

Username checks can race if done only on the client.

Decision:

- rely on a database unique constraint as the source of truth
- optionally add a client-side availability check later only if the UX needs it

### Avatar Upload Scope

Avatar upload can pull Storage policies and image-picker UX into Phase 1.

Decision:

- include nullable `avatar_path` in the schema
- support fallback avatar in the UI
- implement upload only if it does not distract from auth/session correctness

## Handoff To Phase 2

Phase 2 should begin only after Phase 1 has a stable authenticated shell.

Phase 2 can then add:

- Supabase Edge Functions for TMDB
- normalized media models
- search endpoint flow
- title details endpoint flow
- media item upsert strategy

Phase 1 should leave the app ready for that work without any direct TMDB calls from the mobile client.
