# Phase 7 Profile, Settings, And Account Management

## Purpose

This document replaces the earlier standalone `Profile Summary` and `Settings and Account Management` split with one account-focused Phase 7.

The app already has Journal for entry management, Lists for collection management, and Discover for browsing. A separate reflective profile summary does not add enough value for v1. Phase 7 should instead make the avatar-accessed profile/account screen production-ready.

## Phase Goal

Build the combined profile, settings, and account management surface, and remove the remaining dashboard-style home route.

By the end of Phase 7:

- the avatar entry should open a practical profile/account screen
- users should be able to view and edit their display name and username
- users should be able to update their avatar
- users should be able to review connected account information where available
- users should be able to open Privacy Policy, Terms of Use, Credits / Attributions, and Support entry points
- users should be able to sign out
- users should be able to delete their account
- Discover should be the only browsing-focused home surface
- the old dashboard-style `Home` tab/route should be removed or redirected cleanly to Discover
- Journal should remain the management surface for entries
- Lists should remain the management surface for collections

## Why This Phase Changed

The previous plan separated:

- Phase 7: Profile Summary
- Phase 8: Settings and Account Management

The updated product direction is simpler:

- do not build a standalone profile summary screen in v1
- do not duplicate Journal/List summary content inside Profile
- use the existing avatar-accessed profile route as the profile/account/settings surface
- keep production account requirements in one clear place
- keep Discover as the browsing home instead of maintaining a dashboard or `Home` tab concept

## Locked Product And Technical Direction

Phase 7 must follow the locked stack:

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind
- TanStack Query
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- SQL migrations
- generated TypeScript database types

Phase 7 must follow the updated product rules:

- Discover is the browsing-focused home surface.
- There is no separate dashboard surface in v1.
- The bottom tabs should be Discover, Search, Journal, and Lists.
- The avatar action should open the profile/account surface.
- Profile/account owns identity, avatar, legal, sign out, and account deletion actions.
- Journal remains management-focused.
- Lists remain mixed-media and collection-focused.
- Do not add social profile behavior.
- Do not add public profiles.
- Do not add profile taste summaries such as top-rated items, recent reviews, favorite genres, or created lists in v1.

## Non-Goals

Do not implement unrelated product work in Phase 7.

Specifically, do not implement:

- top-rated profile sections
- recent review profile sections
- favorite genre/category profile sections
- created list summary sections
- public profile pages
- follows, comments, likes, or other social features
- recommendation features
- a dashboard tab
- a separate settings screen unless implementation proves it is cleaner and the route is still presented as part of the account surface
- new external media provider behavior
- direct TMDB calls from the client
- game provider integration

## UX Contract

### Profile / Account Screen

The avatar-accessed screen should be a practical account surface.

Required content:

- avatar or fallback initial
- display name
- username
- profile editing entry point
- avatar update entry point
- connected accounts section or calm placeholder if provider data is not available yet
- Privacy Policy entry point
- Terms of Use entry point
- Credits / Attributions entry point
- Support entry point
- Sign Out action
- Delete Account action

The screen should not present itself as a taste dashboard.

### Profile Editing

Required behavior:

- allow display name updates
- allow username updates
- reuse existing username and display-name validation rules
- trim saved values
- show calm validation and mutation errors
- keep route files thin

Optional if manageable:

- allow optional bio editing if the existing schema supports it cleanly

### Avatar Update

Required behavior:

- allow avatar update using Supabase Storage
- update `profiles.avatar_path`
- show loading and error states
- use a fallback initial when no avatar exists

If full image picking/storage integration becomes too large, split avatar update into its own later Phase 7 step rather than expanding scope silently.

### Sign Out

Required behavior:

- sign out from Supabase Auth
- return to the auth welcome flow
- show a calm error if sign out fails

### Account Deletion

Required behavior:

- include a clearly destructive account deletion action
- require confirmation
- remove or anonymize user-owned app data according to the approved backend approach
- delete or deactivate the Supabase Auth user through a trusted server-side path
- return to the auth welcome flow after success

Account deletion must not rely on unsafe client-only privileged operations.

### Legal And Support

Required behavior:

- include Privacy Policy
- include Terms of Use
- include Credits / Attributions
- include Support

These can start as in-app informational screens, static routes, or external links, as long as the user-facing path is clear and production-ready enough for the current app stage.

### Discover Instead Of Home / Dashboard

Required behavior:

- remove the visible `Home` tab label
- keep Discover as the first tab
- redirect root and tabs index routes to Discover
- remove or rename dashboard-style `HomeScreen` usage
- avoid personal summary/dashboard content on Discover

The Discover surface should remain browsing-focused: trending, category rails, and browse listings.

## Likely Files

Likely updated files:

```text
docs/feature-plan.md
docs/version1features.md
docs/folder-structure.md
docs/STACK_DECISIONS.md
app/index.tsx
app/(tabs)/_layout.tsx
app/(tabs)/index.tsx
app/(tabs)/home.tsx
app/profile.tsx
app/settings.tsx
features/discovery/components/HomeScreen.tsx
features/profile/components/ProfileScreen.tsx
features/profile/api/profile-api.ts
features/profile/hooks/useCurrentProfile.ts
features/settings/components/SettingsScreen.tsx
```

Add fewer files if the existing structure remains readable. Prefer moving account behavior into `features/profile` or `features/settings` based on ownership clarity, not route names.

## Implementation Sequence

### 1. Finalize Phase 7 Contract And Plan Updates

Expected outcome:

- this document exists
- `docs/feature-plan.md` reflects the merged Phase 7
- v1 docs no longer require a standalone profile summary screen
- Discover is confirmed as the only browsing-focused home surface
- dashboard/home cleanup is included in Phase 7 scope
- implementation sequence is agreed

Stop after this step and wait for explicit approval before implementing Step 2. After every later numbered step, stop again and wait for explicit approval before moving on.

### 2. Update V1 Screen And Navigation Docs

Expected outcome:

- `docs/version1features.md` reflects the combined profile/account surface
- screen count and navigation rules are updated
- `docs/folder-structure.md` reflects the updated profile/settings ownership
- locked product rules no longer describe Profile as a taste summary surface

### 3. Remove Dashboard/Home Route Ambiguity

Expected outcome:

- bottom tabs show Discover, Search, Journal, and Lists
- root redirects point to Discover
- dashboard-style `Home` route usage is removed or redirected
- Discover screen naming is clear
- no personal dashboard content is introduced

### 4. Build Profile / Account Screen Shell

Expected outcome:

- avatar action opens the account surface
- screen shows identity header, account sections, legal/support sections, and destructive area
- current placeholder sign-out-only UI is replaced
- route files remain thin

### 5. Add Profile Editing

Expected outcome:

- user can update display name
- user can update username
- validation errors are clear
- mutation errors are calm and actionable
- profile query data refreshes after save

### 6. Add Avatar Update

Expected outcome:

- user can choose/update an avatar
- avatar is stored through Supabase Storage
- `profiles.avatar_path` updates
- avatar fallback remains polished
- errors and loading states are handled

### 7. Add Legal, Credits, And Support Entry Points

Expected outcome:

- Privacy Policy is reachable
- Terms of Use is reachable
- Credits / Attributions is reachable
- Support is reachable
- entries use in-app routes or approved external links

### 8. Add Sign Out And Account Deletion

Expected outcome:

- sign out works from the account surface
- account deletion has confirmation
- account deletion uses a trusted server-side path
- user-owned data cleanup follows the approved backend strategy
- successful deletion returns to auth welcome

### 9. Verify Phase 7

Expected outcome:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run check` passes when environment permissions allow
- manual QA confirms Discover is first tab and no dashboard/home tab appears
- manual QA confirms profile/account flows work for an authenticated user
- manual QA confirms sign out and account deletion paths behave correctly

## Acceptance Criteria

Phase 7 is complete when:

1. `docs/phase-7-profile-settings-account.md` exists.
2. Planning docs reflect merged profile/settings/account management.
3. No v1 doc requires a standalone Profile Summary screen.
4. Bottom tabs are Discover, Search, Journal, and Lists.
5. Root and tabs index routes land on Discover.
6. The visible dashboard-style `Home` tab is removed.
7. The avatar action opens a practical profile/account surface.
8. Users can edit display name and username.
9. Users can update their avatar, or avatar update is explicitly split into a later Phase 7 step.
10. Privacy Policy, Terms of Use, Credits / Attributions, and Support are reachable.
11. Users can sign out.
12. Users can delete their account through a trusted server-side path.
13. Journal remains management-focused.
14. Lists remain collection-focused.
15. Discover remains browsing-focused.
16. No direct TMDB client calls are introduced.
17. `npm run typecheck` passes.
18. `npm run lint` passes.
19. `npm run check` passes when environment permissions allow.

## Verification Checklist

Run:

```text
npm run typecheck
npm run lint
npm run check
```

Manual checks:

- Open the app and confirm the first tab is Discover.
- Confirm there is no visible Home/dashboard tab.
- Confirm root navigation lands on Discover.
- Open the avatar action and confirm the profile/account screen appears.
- Edit display name and confirm the change persists.
- Edit username and confirm validation catches invalid or duplicate values.
- Update avatar if the avatar step is included.
- Open Privacy Policy, Terms of Use, Credits / Attributions, and Support.
- Sign out and confirm the app returns to the auth welcome flow.
- Delete an account in a safe test environment and confirm cleanup/navigation behavior.
- Confirm Journal still owns entry management.
- Confirm Lists still owns collection management.
- Confirm Discover has no personal dashboard content.

## Handoff To Phase 8

Phase 7 should leave Phase 8 with:

- production-ready account/profile basics
- legal/support entry points
- sign out and account deletion paths
- Discover-only home navigation
- no standalone profile summary requirement

Phase 8 can then focus on quality and production hardening instead of basic account completion.
