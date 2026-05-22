# Phase 0 Project Setup

## Purpose

This document expands the Phase 0 section from `docs/feature-plan.md` into a detailed implementation plan.

Phase 0 is the foundation phase. Its job is to turn the repository from a planning/docs repo into a bootable Expo React Native app with the correct architecture, routing, styling, data-fetching, and backend wiring in place.

This phase should not build the main product features yet. It should prepare the codebase so Phase 1 and later phases can be implemented cleanly.

## Phase Goal

Establish the app foundation before feature development.

By the end of Phase 0:

- the app should boot successfully
- Expo Router should be configured
- NativeWind should be configured
- TanStack Query should be available globally
- Supabase client wiring should exist
- environment configuration should be documented
- the intended folder structure should exist
- basic shared UI primitives should be available
- placeholder route screens should prove navigation works

## Non-Goals

Do not build full product features in Phase 0.

Specifically, do not implement:

- real Google authentication
- real Apple authentication
- real email OTP verification
- onboarding persistence
- TMDB Edge Functions
- title search
- title details
- journal entry creation
- journal timeline or calendar logic
- lists CRUD
- profile statistics
- account deletion
- release build setup

Small placeholder screens are acceptable only to verify routing and app structure.

## Current Starting Point

At the start of Phase 0, the repository contains project documentation and planning files, but does not yet contain the Expo app implementation.

Existing docs that shape Phase 0:

- `docs/STACK_DECISIONS.md`
- `docs/version1features.md`
- `docs/react-native-guidelines.md`
- `docs/folder-structure.md`
- `docs/database-schema.md`
- `docs/feature-plan.md`

The implementation should follow those documents unless the user explicitly changes direction.

## Locked Technical Direction

Phase 0 must use:

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind
- TanStack Query
- Supabase client libraries

Phase 0 must prepare for:

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Edge Functions
- TMDB integration through Edge Functions
- generated Supabase database types

Phase 0 must avoid:

- an ORM
- direct production TMDB calls from the mobile client
- a large global state library
- a full component-library-driven visual identity
- overbuilt abstractions before features exist

## Implementation Sequence

### 1. Initialize The Expo App

Create the Expo React Native app inside the existing repository.

Expected outcome:

- package configuration exists
- TypeScript config exists
- Expo app config exists
- app can be started through Expo tooling
- existing docs and repo files remain intact

Likely files introduced:

- `package.json`
- `package-lock.json` or another lockfile depending on the chosen package manager
- `app.json` or `app.config.ts`
- `tsconfig.json`
- `babel.config.js`
- `metro.config.js` if needed
- Expo-generated baseline assets

Notes:

- Preserve the existing repository history and docs.
- Prefer the standard Expo TypeScript setup.
- Keep configuration minimal until the app needs more.

### 2. Set Up Expo Router

Configure Expo Router as the app navigation layer.

Expected outcome:

- file-based routing works
- the app has root layout wiring
- placeholder auth, tab, stack, and modal routes exist

Initial route shape:

```text
app/
  _layout.tsx
  (auth)/
    welcome.tsx
    email-code.tsx
    onboarding.tsx
  (tabs)/
    _layout.tsx
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

Route responsibilities:

- `app/` files should stay thin
- route files can render placeholder feature screens during Phase 0
- future business logic belongs in `features/`, not route files

Placeholder behavior:

- Auth routes can show simple screen names and buttons
- The auth welcome route should not be named `index.tsx` during Phase 0 because it conflicts with the root `/` redirect into the tab shell
- Tab routes can show simple screen shells
- Detail and modal routes can show route labels
- No real auth guard is required yet

### 3. Set Up NativeWind

Configure NativeWind for utility-based React Native styling.

Expected outcome:

- `className` styling works in React Native components
- Tailwind content paths include app, components, and features
- the project has an initial token foundation

Likely files introduced or updated:

- `tailwind.config.js`
- `babel.config.js`
- `global.css` or equivalent NativeWind entry file, depending on the Expo setup
- app root imports required styles

Initial token areas:

- colors
- spacing
- border radius
- typography scale
- semantic surface colors
- muted text
- success/error/warning states

Guidance:

- Keep the theme tasteful and app-specific.
- Avoid making the UI a one-color theme.
- Keep tokens simple until actual screens put pressure on the design system.

### 4. Set Up TanStack Query

Add TanStack Query as the server-state layer.

Expected outcome:

- a QueryClient is configured
- the root app layout provides `QueryClientProvider`
- future features can add queries and mutations without rewriting app root

Likely files introduced:

```text
lib/
  query/
    client.ts
    QueryProvider.tsx
```

Initial configuration should stay conservative:

- basic retry behavior
- sensible stale times only if useful
- no complex persistence or offline cache yet

Notes:

- Do not introduce a global state library in Phase 0.
- TanStack Query should handle future server state.
- Local component state remains enough for simple UI state.

### 5. Configure Supabase Client Wiring

Add the Supabase client setup, but do not build real auth flows yet.

Expected outcome:

- Supabase client can be imported from a single location
- environment variables are documented
- the app does not commit real secrets
- future auth and data features have a stable backend entry point

Likely files introduced:

```text
lib/
  supabase/
    client.ts
    types.ts
    auth.ts
```

Environment files:

- `.env.example`
- optionally `.env.local` ignored by git

Expected environment variables:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Important:

- Public anon key usage is expected in Supabase clients.
- Service role keys must never be used in the mobile app.
- Third-party API keys such as TMDB keys should not go into the mobile client.

### 6. Add Environment Docs And Initial Tokens

Document environment configuration and add stable app/domain tokens before building real features.

Expected outcome:

- required public environment variables are documented
- private values are clearly marked as server-only
- initial app constants exist
- initial domain constants exist
- shared domain types exist
- theme values are aligned between React Navigation and NativeWind

Likely files introduced or updated:

```text
docs/environment.md
constants/app.ts
constants/media.ts
constants/journal.ts
constants/ratings.ts
constants/reviews.ts
constants/tokens.js
constants/theme.ts
types/media.ts
types/journal.ts
types/profile.ts
```

Guidance:

- Use `EXPO_PUBLIC_*` only for values that are safe to bundle into the app.
- Keep service role keys, TMDB keys, and other private secrets out of the mobile client.
- Include games in media constants for model extensibility, but keep IGDB integration deferred.

### 7. Create Base Folder Structure

Create the feature-oriented folder structure described in `docs/folder-structure.md`.

Expected top-level structure:

```text
app/
components/
constants/
docs/
features/
hooks/
lib/
types/
assets/
supabase/
```

Expected shared component structure:

```text
components/
  ui/
  media/
  feedback/
```

Expected feature structure:

```text
features/
  auth/
  discovery/
  journal/
  lists/
  media/
  profile/
  settings/
```

Expected infrastructure structure:

```text
lib/
  supabase/
  query/
  media/
  utils/
```

Expected Supabase structure:

```text
supabase/
  migrations/
  functions/
  seed/
```

Guidance:

- Empty folders may need placeholder files if git tracking is required.
- Avoid adding vague folders like `services`, `common`, or generic `helpers`.
- Keep feature ownership clear from the start.

### 8. Add Shared Constants And Types

Add initial domain constants and shared types that are stable across features.

Likely files:

```text
constants/
  media.ts
  journal.ts
  ratings.ts

types/
  media.ts
  journal.ts
  profile.ts
```

Initial constants:

- media types: `movie`, `series`, `anime`, `game`
- journal statuses: `planned`, `in_progress`, `completed`, `dropped`
- rating min/max/step: `0.5`, `5`, `0.5`
- review headline max length: `80`
- review body max length in the short-form range

Notes:

- Games should exist in shared types for future extensibility.
- Game API integration remains deferred.
- Keep constants small and clearly owned.

### 9. Add Basic UI Primitives

Create a small custom component layer for future screens.

Recommended Phase 0 primitives:

```text
components/ui/
  Button.tsx
  TextField.tsx
  Card.tsx
  Chip.tsx
  Screen.tsx
  SectionHeader.tsx

components/media/
  MediaPoster.tsx
  RatingBadge.tsx
  StatusBadge.tsx

components/feedback/
  EmptyState.tsx
  ErrorState.tsx
  LoadingState.tsx
```

Guidance:

- Keep components simple.
- Avoid too many variants too early.
- Prefer clear props over clever abstractions.
- Make touch targets comfortable.
- Include loading, disabled, and error-ready states where relevant.

Phase 0 components should be enough to style placeholders and support Phase 1 screens, but they should not try to solve every future design case.

### 10. Add Feature Placeholder Screens

Create placeholder screen components inside feature folders so routes do not become the app architecture.

Likely files:

```text
features/auth/components/WelcomeAuthScreen.tsx
features/auth/components/EmailCodeScreen.tsx
features/auth/components/OnboardingScreen.tsx

features/discovery/components/HomeScreen.tsx
features/discovery/components/SearchScreen.tsx

features/journal/components/JournalScreen.tsx
features/journal/components/JournalEntryModalScreen.tsx

features/lists/components/ListsScreen.tsx
features/lists/components/ListDetailsScreen.tsx

features/media/components/TitleDetailsScreen.tsx

features/profile/components/ProfileScreen.tsx

features/settings/components/SettingsScreen.tsx
```

Expected behavior:

- each route imports and renders the matching feature screen
- placeholder screens show simple content proving route ownership
- no real data fetching is required

### 11. Prepare Supabase Backend Folders

Create Supabase project structure without implementing full backend features yet.

Expected structure:

```text
supabase/
  migrations/
  functions/
  seed/
```

Possible Phase 0 files:

- `supabase/README.md`
- placeholder `.gitkeep` files

Do not add the full database schema migration unless Phase 0 scope is explicitly expanded.

Reason:

- database migrations are important, but Phase 0's core deliverable is the bootable app foundation
- schema implementation can be handled as part of Phase 1 or a dedicated backend setup task

### 12. Add Project Scripts

Add useful scripts for development and verification.

Expected scripts:

- start Expo
- run Android
- run iOS where supported
- run web if useful
- lint
- typecheck

Example script names:

```text
start
android
ios
web
lint
typecheck
```

Guidance:

- Keep scripts conventional.
- Avoid adding complex custom tooling before it is needed.

### 13. Verify The App Boots

Run the app or at least run local checks that prove the foundation is sound.

Minimum verification:

- dependencies install successfully
- TypeScript passes
- lint passes if configured
- Expo starts without configuration errors
- route placeholders compile
- NativeWind classes render without runtime errors
- Query provider does not crash app boot
- Supabase client imports without missing environment handling failures

If a full simulator/device test is not possible, document what was verified and what remains manual.

## Expected Deliverables

Phase 0 should deliver:

- bootable Expo TypeScript app
- Expo Router route skeleton
- NativeWind configuration
- TanStack Query provider
- Supabase client setup
- documented environment variables
- base feature-oriented folder structure
- initial shared constants and types
- basic reusable UI primitives
- placeholder screens for planned app routes
- verification that the app compiles and starts

## Acceptance Criteria

Phase 0 is complete when:

1. `npm install` or the chosen package install command succeeds.
2. The app starts through Expo without configuration errors.
3. Expo Router recognizes the planned route structure.
4. The bottom tab shell exists with Home, Search, Journal, and Lists.
5. Auth placeholder routes exist for Welcome, Email Code, and Onboarding.
6. Shared pushed routes exist for Title Details, List Details, Profile, and Settings.
7. The Add/Edit Journal Entry modal route exists as a modal route.
8. NativeWind styling works on at least one shared component and one screen.
9. TanStack Query provider wraps the app.
10. Supabase client setup exists and reads documented environment variables.
11. Shared UI primitives are available.
12. Feature folders exist and route files import feature screen components.
13. TypeScript checks pass.
14. The implementation does not introduce major product features prematurely.

## Suggested Build Order

The recommended order is:

1. Scaffold Expo TypeScript app.
2. Install and configure Expo Router.
3. Add route skeleton and placeholder screens.
4. Install and configure NativeWind.
5. Add initial theme tokens.
6. Install and configure TanStack Query.
7. Add Supabase client and environment docs.
8. Create folder structure.
9. Add shared constants and types.
10. Add basic UI primitives.
11. Wire placeholders through feature components.
12. Run typecheck, lint, and Expo start verification.

## Risks And Decisions To Watch

### Package Versions

Expo, NativeWind, TanStack Query, and Supabase libraries should be installed using versions compatible with the selected Expo SDK.

Decision:

- confirm versions during implementation instead of hardcoding old package versions in docs

### Environment Variables

Expo public environment variables are bundled into the app.

Decision:

- only use public-safe values in `EXPO_PUBLIC_*`
- keep private service keys and TMDB secrets out of the mobile app

### UI Scope

It is tempting to design many components early.

Decision:

- create only the primitives needed for Phase 0 and Phase 1
- expand the component layer only when repeated real UI patterns appear

### Auth Scope

Auth is the first real feature phase, but not part of Phase 0.

Decision:

- prepare routes and Supabase wiring only
- build real auth flows in Phase 1

### Database Scope

The database schema is already planned, but implementing migrations can be a separate backend-focused task.

Decision:

- create Supabase folders in Phase 0
- only add migrations in Phase 0 if the implementation task explicitly includes backend schema setup

## Handoff To Phase 1

Phase 1 can begin once Phase 0 has a stable app shell.

Phase 1 will build on Phase 0 by adding:

- real Welcome/Auth screen behavior
- Google sign-in
- Apple sign-in on iOS
- email OTP or magic link flow
- onboarding profile form
- profile persistence in Supabase
- session handling
- protected routing between auth and app tabs

Phase 0 should make that work feel straightforward instead of requiring more project setup.
