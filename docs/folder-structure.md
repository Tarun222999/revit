# Folder Structure

## Purpose

This document defines the intended codebase structure for the app so we can scale features without making the project hard to navigate.

The goals are:

- clear ownership
- thin route files
- feature-oriented organization
- reusable but not over-abstracted UI
- easy onboarding for future contributors or future chats

## Guiding Rules

1. Routes are not the app architecture. They are entry points.
2. Feature logic should live near the feature, not inside route files.
3. Shared code should be intentionally shared, not dumped into generic folders.
4. UI primitives and domain components should be separated.
5. Third-party API normalization should live in one place.

## Proposed Top-Level Structure

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

## Folder Responsibilities

### `app/`

This is the Expo Router route layer.

Use this folder for:

- route files
- route groups
- layout files
- modal routes
- screen entry composition

Do not put heavy business logic here.

Example shape:

```text
app/
  _layout.tsx
  (auth)/
    index.tsx
    email-code.tsx
    onboarding.tsx
  (tabs)/
    _layout.tsx
    home.tsx
    search.tsx
    journal.tsx
    lists.tsx
    profile.tsx
  title/
    [id].tsx
  lists/
    [id].tsx
  settings.tsx
  modals/
    journal-entry.tsx
```

Notes:

- `(auth)` contains auth flow screens
- `(tabs)` contains primary destinations
- `modals/` contains modal routes such as add/edit journal entry

### `components/`

Use for shared UI that is reused across features.

Split into:

```text
components/
  ui/
  media/
  feedback/
```

#### `components/ui/`

Small reusable primitives:

- Button
- TextField
- Card
- Chip
- Avatar
- Screen
- SectionHeader

#### `components/media/`

Reusable display components for media items:

- MediaPoster
- MediaRow
- MediaGridCard
- RatingBadge
- StatusBadge

#### `components/feedback/`

Cross-feature states:

- EmptyState
- LoadingState
- ErrorState
- InlineNotice

### `constants/`

Use for stable app-wide constants only.

Examples:

- status values
- media type values
- rating limits
- route names if needed

Do not dump random configuration here.

### `docs/`

Project guidance and decision records.

Current examples:

- stack decisions
- React Native guidelines
- folder structure
- database schema
- feature decisions

### `features/`

This is the main home for product logic.

Organize by domain:

```text
features/
  auth/
  discovery/
  journal/
  lists/
  profile/
  settings/
  media/
```

Each feature can contain:

```text
feature-name/
  api/
  components/
  hooks/
  model/
  utils/
  types.ts
```

#### `api/`

Feature-specific data access and query wiring.

Examples:

- auth mutations
- journal queries
- list mutations

#### `components/`

Feature-specific components that are not shared globally.

Examples:

- JournalFilterBar
- ReviewComposer
- DiscoverRail

#### `hooks/`

Feature-specific hooks.

Examples:

- useJournalEntries
- useCreateJournalEntry
- useUserLists

#### `model/`

Feature-specific data mapping, business rules, and view models when needed.

Examples:

- transforming DB rows into UI-friendly shapes
- profile stat calculations

#### `utils/`

Small scoped helpers owned by that feature only.

### `hooks/`

Only use this top-level folder for truly cross-feature hooks.

Examples:

- useDebounce
- useAppTheme
- useKeyboardInsets

Do not put feature hooks here if they belong under a feature folder.

### `lib/`

Infrastructure and shared integrations.

Suggested structure:

```text
lib/
  supabase/
  query/
  auth/
  media/
  utils/
```

#### `lib/supabase/`

Use for:

- Supabase client setup
- auth client helpers
- typed database helpers

Suggested files:

```text
lib/supabase/
  client.ts
  types.ts
  auth.ts
```

#### `lib/query/`

Use for:

- TanStack Query client setup
- shared query helpers
- invalidation helpers if needed

#### `lib/auth/`

Use for cross-feature auth wiring if it outgrows `features/auth`.

#### `lib/media/`

Use for external media normalization and provider glue.

Suggested shape:

```text
lib/media/
  types.ts
  normalize-tmdb.ts
  mappers.ts
```

Important:

- UI should consume normalized media objects
- raw TMDB responses should not spread across the app

#### `lib/utils/`

Use only for small generic helpers with clear shared usage.

Avoid vague utility dumping.

### `types/`

Use for shared domain types that are used across multiple features.

Examples:

- MediaItem
- JournalStatus
- AppUser

If a type belongs only to one feature, keep it in that feature.

### `assets/`

Use for:

- fonts
- images
- icons
- splash-related assets

### `supabase/`

Use for Supabase project assets and backend-related files.

Suggested structure:

```text
supabase/
  migrations/
  functions/
  seed/
```

#### `migrations/`

- SQL migrations

#### `functions/`

- Edge Functions
- external API proxy logic

#### `seed/`

- optional local seed data or setup SQL

## Route-to-Feature Relationship

A route file should usually do one of these:

1. import and render a screen component from a feature
2. wire route params into a feature hook or screen
3. define navigation options

Example:

```text
app/(tabs)/journal.tsx
  -> features/journal/components/JournalScreen.tsx
```

This keeps routing and feature logic separate.

## Suggested Feature Breakdown

### `features/auth`

Owns:

- Google auth flow
- Apple auth flow
- Email OTP flow
- onboarding completion

Suggested files:

```text
features/auth/
  components/
    WelcomeAuthScreen.tsx
    EmailCodeScreen.tsx
    OnboardingScreen.tsx
  hooks/
    useGoogleSignIn.ts
    useAppleSignIn.ts
    useEmailOtp.ts
  api/
    auth-mutations.ts
  types.ts
```

### `features/discovery`

Owns:

- Home Discover tab
- trending rails
- category rails
- search results shaping

### `features/journal`

Owns:

- journal timeline
- journal calendar
- add/edit entry modal
- journal filters and sorting
- entry CRUD

### `features/lists`

Owns:

- lists overview
- single list details
- create/edit list
- add/remove list items

### `features/profile`

Owns:

- profile summary
- stats
- recent reviews
- top-rated items

### `features/settings`

Owns:

- settings UI
- connected accounts
- attribution/privacy/terms entry points
- delete account flow

## Naming Conventions

### Files

- components: `PascalCase.tsx`
- hooks: `useSomething.ts`
- helpers: `camelCase.ts`
- route files: Expo Router conventions

### Folders

- use lowercase
- use hyphenated names only when it improves readability

## What To Avoid

Avoid structures like:

```text
utils/
helpers/
common/
shared/
services/
```

unless each folder has a very clear and limited purpose.

Avoid:

- giant global services folder
- giant global types folder
- route files with business logic
- raw API mapping duplicated in multiple screens

## Example Build Path

A search result tap might flow like this:

1. `app/(tabs)/search.tsx`
2. `features/discovery/components/SearchScreen.tsx`
3. `features/discovery/hooks/useSearchTitles.ts`
4. `lib/media/normalize-tmdb.ts`
5. `app/title/[id].tsx`
6. `features/media/components/TitleDetailsScreen.tsx`

This keeps responsibilities clear and scalable.

## Recommended Initial Structure

If we start coding now, this would be a good minimal first version:

```text
app/
components/
  ui/
  media/
  feedback/
docs/
features/
  auth/
  discovery/
  journal/
  lists/
  profile/
  settings/
lib/
  supabase/
  query/
  media/
types/
supabase/
  migrations/
  functions/
```
