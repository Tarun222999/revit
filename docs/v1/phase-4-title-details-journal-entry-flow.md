# Phase 4 Title Details And Journal Entry Flow

## Purpose

This document expands Phase 4 from `docs/feature-plan.md` into a concrete implementation plan for the core journal loop.

Phase 4 should turn the existing search and discovery paths into a useful personal action: open a title, review its details, and add or edit the user's journal entry for that title. This phase should keep Title Details polished enough to support the decision to journal a title, while leaving the full Journal timeline/calendar experience for Phase 5.

## Phase Goal

Implement Title Details and Add/Edit Journal Entry.

By the end of Phase 4:

- Title Details should show a production-minded details layout for normalized media.
- Title Details should show the user's existing entry state when a title is already in the journal.
- Users should be able to open an Add/Edit Journal Entry modal from Title Details.
- Users should be able to create, update, and delete their own journal entry.
- Journal entries should support status, rating, optional review headline, review body, spoiler flag, and completed date.
- The app should persist journal entries in Supabase Postgres with RLS.
- Client code should continue to use normalized app media objects and Supabase app data, not direct TMDB calls.

## Non-Goals

Do not implement unrelated product work in Phase 4.

Specifically, do not implement:

- Journal Timeline view
- Journal Calendar view
- journal filtering and sorting
- dashboard personalization
- list creation or Add to List behavior
- profile stats
- game provider integration
- direct TMDB calls from the client

Small placeholders for secondary actions such as Add to List are acceptable when needed to preserve the final Title Details layout.

## Current Starting Point From Phase 3.1

Phase 3 and Phase 3.1 left the app in this state:

- Search and Discover route selected titles into `app/title/[id].tsx`.
- `features/media/components/TitleDetailsScreen.tsx` exists as Phase 2 verification UI.
- `features/media/hooks/useMediaDetails.ts` loads normalized media details through `media-details`.
- `media-details` upserts opened TMDB titles into `media_items`.
- Discover listing pages are polished browse-only surfaces.
- `app/modals/journal-entry.tsx` exists and renders a placeholder.
- `features/journal/components/JournalEntryModalScreen.tsx` exists as a placeholder.
- `features/journal/components/JournalScreen.tsx` remains a Phase 5 placeholder.
- `journal_entries` has not been added yet.
- `lists` and `list_items` remain future work.

## Locked Product And Technical Direction

Phase 4 must follow the locked stack:

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind
- TanStack Query
- Supabase Auth
- Supabase Postgres
- SQL migrations
- generated TypeScript database types

Phase 4 must follow the locked product rules:

- Add/Edit Journal Entry is a modal flow.
- Journal is management-focused, but the full Journal screen waits for Phase 5.
- Reviews are short-form.
- Rating uses a `0.5` to `5.0` scale.
- Review headline is optional and limited to 80 characters.
- Review body uses the existing v1 short-form limit of 500 characters.
- `completed_on` should be stored and visible where relevant.
- `started_on` can remain stored for future use but does not need first-pass UI.

## Step 1 Contract Decisions

These decisions finalize Phase 4 Step 1 and should be treated as the implementation contract for later steps.

### Journal Entry Schema

Use the planned `journal_entries` schema from `docs/database-schema.md` with these v1 constraints:

- `status` is required and limited to `planned`, `in_progress`, `completed`, and `dropped`.
- `rating` is nullable and, when present, must be between `0.5` and `5.0` in `0.5` increments.
- `review_headline` is nullable and limited to 80 characters.
- `review_body` is nullable and limited to 500 characters, matching `constants/reviews.ts`.
- `contains_spoilers` defaults to `false`.
- `started_on` remains stored but hidden in the first Phase 4 UI.
- `completed_on` is nullable and exposed only when status is `completed`.
- `last_activity_at` updates on create and on meaningful entry edits.

### Completed Date Behavior

When a user changes status away from `completed`, clear `completed_on` automatically before saving.

Why:

- it avoids stale completion dates on planned, in-progress, or dropped entries
- it keeps Phase 5 calendar/timeline data easier to reason about
- users can set the date again if they later mark the entry completed

### Modal Route Param Contract

Use the existing modal route:

```text
app/modals/journal-entry.tsx
```

The modal accepts:

```text
mediaItemId string required
entryId string optional
```

Create mode:

```text
/modals/journal-entry?mediaItemId=<media_items.id>
```

Edit mode:

```text
/modals/journal-entry?mediaItemId=<media_items.id>&entryId=<journal_entries.id>
```

Title Details should only enable Add/Edit Journal Entry after `media-details` has returned a persisted `media_items.id`. If details are still loading or the item is not persisted, the action should remain disabled with a calm loading state.

### Rating Input Contract

Use a first-pass custom React Native rating slider owned by `features/journal/components/RatingInput.tsx`.

Behavior:

- supports nullable rating
- supports `0.5` increments
- clamps between `0.5` and `5.0`
- shows the selected value as `x / 5`
- includes a clear action for removing a rating
- uses the existing `constants/ratings.ts` values

Do not add a new slider dependency in Step 1. If the custom control proves weak during implementation or device testing, revisit the dependency decision before shipping Phase 4.

### Lists Boundary

Add to List remains visible on Title Details as a secondary future action, but list attachment is not implemented in Phase 4.

Behavior for Phase 4:

- show Add to List as disabled, or show a small non-blocking notice that lists arrive in Phase 6
- do not create fake list data
- do not add list selection to the journal entry modal yet

After Phase 6, list attachment can be added either from Title Details or as an optional multi-select inside the journal entry modal.

## Database Scope

Add the `journal_entries` table from `docs/database-schema.md`.

Recommended columns:

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null references profiles(id)
media_item_id uuid not null references media_items(id)
status text not null
rating numeric(2,1) null
review_headline text null
review_body text null
contains_spoilers boolean not null default false
started_on date null
completed_on date null
last_activity_at timestamptz not null default now()
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Required constraints:

- unique on `(user_id, media_item_id)`
- status check for `planned`, `in_progress`, `completed`, and `dropped`
- rating check allowing null or values from `0.5` to `5.0` in `0.5` increments
- review headline max length of 80 characters
- review body max length of 500 characters

Recommended indexes:

- `journal_entries (user_id, updated_at desc)`
- `journal_entries (user_id, status)`
- `journal_entries (user_id, media_item_id)` unique

RLS:

- users can select only their own journal entries
- users can insert only their own journal entries
- users can update only their own journal entries
- users can delete only their own journal entries

## Journal Entry Model

Use a feature-owned journal model instead of scattering row shapes through UI files.

Recommended files:

```text
features/journal/types.ts
features/journal/api/journal-api.ts
features/journal/hooks/useJournalEntryForMedia.ts
features/journal/hooks/useJournalEntryMutations.ts
```

Recommended status values:

```text
planned
in_progress
completed
dropped
```

Recommended UI labels:

```text
Planned
In Progress
Completed
Dropped
```

Mutation behavior:

- creating an entry should set `last_activity_at` to now
- updating meaningful fields should update `last_activity_at` and `updated_at`
- selecting `completed` should allow setting `completed_on`
- moving away from `completed` should clear `completed_on`
- duplicate creates should be handled calmly through the unique `(user_id, media_item_id)` constraint

## Title Details Scope

Title Details should be upgraded from verification UI into a real product screen.

Recommended content:

- poster or backdrop artwork
- title
- year
- media type badge
- metadata row
- genres when available
- summary
- release date or first air date where available
- runtime, season count, network, studio, or production company where available in metadata
- Your Entry section
- primary Add to Journal or Edit Entry action
- secondary Add to List action as a disabled or placeholder action until Phase 6

Your Entry section should show:

- empty state when not logged
- current status when logged
- rating when set
- review headline or preview when set
- completed date when set
- date logged or last updated when useful

## Modal Scope

The Add/Edit Journal Entry flow should stay modal, focused, and fast.

Recommended route:

```text
app/modals/journal-entry.tsx
```

Recommended route params:

```text
mediaItemId string required
entryId string optional
```

Use `mediaItemId` for create mode. Include `entryId` for edit mode.

Recommended controls:

- close button
- title and thumbnail
- status selector
- rating slider
- optional headline input
- review text area
- spoiler toggle
- completed date input when status is completed
- sticky Save button
- Delete Entry action only in edit mode

Validation:

- status is required
- rating must be null or between `0.5` and `5.0` in `0.5` increments
- headline max length is 80
- review body max length is 500
- completed date is optional, but should only be submitted when meaningful for completed entries

## Phase 4.1 Modal UX Polish Backlog

Keep these improvements out of the core Phase 4 implementation unless the user explicitly moves them forward. Phase 4 should finish the journal entry CRUD path first; Phase 4.1 should refine the modal interaction quality after the flow is working end to end.

Phase 4.1 should address:

- Replace the generic `Close` button with a more intentional modal dismiss control that matches the app's visual language.
- Replace the generic native delete confirmation alert with a custom destructive confirmation modal that matches the journal flow.
- Redesign the spoiler toggle so it feels integrated with the journal form instead of using a bland default switch treatment.
- Fix mobile keyboard avoidance for the review text area so the keyboard does not cover the field while the user writes.
- Improve the rating input affordance so users understand whether it is tap-based, draggable, or both.
- Support a gesture-based modal dismiss path, such as dragging or swiping the modal down, instead of requiring only the close/back action.

Phase 4.1 verification should include real mobile-device or emulator testing, because keyboard avoidance and gesture dismissal cannot be judged accurately from desktop web alone.

## Component Structure

Keep route files thin and put feature work near the owning feature.

Likely new files:

```text
features/journal/api/journal-api.ts
features/journal/components/JournalEntryForm.tsx
features/journal/components/JournalStatusSelector.tsx
features/journal/components/RatingInput.tsx
features/journal/components/YourEntrySummary.tsx
features/journal/hooks/useJournalEntryForMedia.ts
features/journal/hooks/useJournalEntryMutations.ts
features/journal/types.ts
```

Likely updated files:

```text
app/title/[id].tsx
app/modals/journal-entry.tsx
features/media/components/TitleDetailsScreen.tsx
features/journal/components/JournalEntryModalScreen.tsx
lib/supabase/types.ts
```

Add more components only when they make the screen and modal easier to scan.

## Implementation Sequence

### 1. Finalize Phase 4 Contract

Expected outcome:

- confirmed the `journal_entries` schema details
- chose a 500-character review body limit
- decided that `completed_on` clears when status is not completed
- decided the modal route param contract: required `mediaItemId`, optional `entryId`
- decided the first-pass rating input implementation: custom feature-owned slider using existing rating constants
- documented list attachment as a Phase 6 boundary

Stop after this step and wait for explicit approval before implementing Step 2.

### 2. Add `journal_entries` Migration And RLS

Expected outcome:

- table exists with constraints, indexes, timestamps, and RLS
- users can manage only their own entries
- one entry per user/media item is enforced
- client writes remain limited to authenticated users' own rows

### 3. Regenerate Supabase Types

Expected outcome:

- `lib/supabase/types.ts` includes `journal_entries`
- journal API helpers use generated table types where useful

### 4. Define Journal Types And Constants

Expected outcome:

- app has shared journal status values and labels
- app has typed create/update/delete payloads
- UI files do not depend directly on broad database row shapes where a narrower model is clearer

### 5. Add Journal API Helpers And Query Hooks

Expected outcome:

- add helper to fetch the current user's entry for a media item
- add create, update, and delete helpers
- add TanStack Query hooks for the Title Details and modal flows
- mutation success invalidates relevant journal entry and future journal list keys

### 6. Upgrade Title Details UI

Expected outcome:

- Title Details becomes a real v1 details screen
- details still load through `media-details`
- no direct TMDB client call is introduced
- the screen shows loading, error, and empty states
- the screen shows a Your Entry section driven by the journal entry query
- Add/Edit Journal Entry opens the modal with the agreed route params

### 7A. Build Journal Entry Modal Form UI And State

Expected outcome:

- modal supports create and edit modes
- modal loads media and existing entry data as needed
- status, rating, headline, review body, spoiler flag, and completed date can be edited
- validation is visible and calm
- Save action can remain disabled or locally handled until Step 7B
- no create/update mutation is required in this step

Stop after this step and wait for explicit approval before implementing Step 7B.

### 7B. Wire Journal Entry Save Flow

Expected outcome:

- create mode uses `useCreateJournalEntry`
- edit mode uses `useUpdateJournalEntry`
- form values map cleanly into mutation input
- Save is disabled while submitting
- successful save returns to Title Details and refreshes entry state
- mutation failures show a useful error state

### 8. Add Delete Entry Flow

Expected outcome:

- delete is available only for existing entries
- destructive action is clearly separated
- user confirms before deletion
- successful delete returns to Title Details and refreshes entry state

### 9. Wire Navigation And Modal Presentation

Expected outcome:

- `app/modals/journal-entry.tsx` remains a modal route
- stack presentation matches the existing app layout
- route files stay thin
- back/close behavior is predictable on iOS, Android, and web

### 10. Verify No Direct TMDB Client Calls

Expected outcome:

- no app/client file contains direct TMDB URLs or credentials
- title details still use Supabase Edge Functions
- journal CRUD uses Supabase Postgres app tables

### 11. Verify Phase 4

Expected outcome:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run check` passes when environment permissions allow
- user can open a title from Search or Discover
- user can create a journal entry
- user can edit a journal entry
- user can delete a journal entry
- duplicate entry behavior is handled cleanly
- completed entries can store `completed_on`
- failed saves show a useful error state

## Acceptance Criteria

Phase 4 is complete when:

1. `docs/phase-4-title-details-journal-entry-flow.md` exists.
2. `journal_entries` exists with constraints, indexes, RLS, and generated TypeScript types.
3. Title Details shows polished normalized media details.
4. Title Details shows whether the current user has an entry for the title.
5. Title Details opens Add/Edit Journal Entry as a modal.
6. Users can create a journal entry for a media item.
7. Users can update status, rating, headline, review body, spoiler flag, and completed date.
8. Users can delete a journal entry.
9. One user cannot read or mutate another user's journal entries.
10. Rating uses the `0.5` to `5.0` scale.
11. Review headline is optional and limited to 80 characters.
12. Review body uses the selected short-form limit.
13. Completed date is visible where relevant.
14. No client code calls TMDB directly.
15. `npm run typecheck` passes.
16. `npm run lint` passes.
17. `npm run check` passes when environment permissions allow.

## Verification Checklist

Run:

```text
npm run typecheck
npm run lint
npm run check
```

Manual checks:

- Open a title from Search.
- Open a title from Discover rails.
- Open a title from a Discover Listing page.
- Confirm Title Details shows artwork, metadata, summary, and action buttons.
- Add a title to the journal with status `planned`.
- Add a rating and review.
- Mark a title `completed` and set `completed_on`.
- Edit the same entry and confirm the Title Details Your Entry section updates.
- Delete the entry and confirm Title Details returns to the empty entry state.
- Try saving invalid rating/headline/body values and confirm validation.
- Confirm a failed network mutation shows an actionable error.
- Confirm the Journal tab remains a Phase 5 placeholder.
- Confirm no app/client file contains `api.themoviedb.org`.

## Handoff To Phase 5

Phase 5 should begin after users can reliably create and maintain journal entries from Title Details.

Phase 5 can then build:

- Journal screen shell
- Timeline view
- Calendar view
- filters for media type, status, and rating
- sorting controls
- connected journal list queries

Phase 4 should leave Phase 5 with stable journal entry CRUD hooks, typed models, and a clear query invalidation path.
