# Phase 6 Lists

## Purpose

This document expands Phase 6 from `docs/feature-plan.md` into a concrete contract for mixed-media Lists.

Phase 6 should replace the current Lists placeholders with real user-owned list management backed by Supabase. It should also connect the Title Details `Add to List` action so users can organize movies, series, and anime into custom collections.

## Phase Goal

Build mixed-media Lists.

By the end of Phase 6:

- users should be able to view their custom lists
- users should be able to create, edit, and delete lists
- users should be able to open a Single List Details screen
- users should be able to see list items joined with normalized media metadata
- users should be able to add a title to one or more lists from Title Details
- users should be able to remove items from lists
- list items should support an optional note
- lists should be mixed-media by default
- client code should not call third-party content APIs directly

## Visual Direction

Lists should feel like a personal curation surface, not a generic database table.

Use the existing visual language from Journal and Title Details:

- warm dark surfaces
- compact, readable cards
- poster-forward media rows
- clear empty states
- calm management actions

The Lists overview should make each list easy to scan through:

- name
- optional description
- item count
- mixed-media cover collage or poster strip
- updated or created date where useful

Single List Details should prioritize the list's contents:

- list title and description
- item count
- edit list action
- add items action
- vertical media item list
- remove item affordance
- optional note display/editing when present

## Non-Goals

Do not implement unrelated product work in Phase 6.

Specifically, do not implement:

- Profile stats or created-lists summary
- dashboard list summaries
- public lists
- list sharing
- comments, likes, follows, or other social features
- recommendations
- manual drag-and-drop ordering
- game provider integration
- direct TMDB calls from the client
- new external content provider behavior
- long-form reviews
- a new core modal route unless the user explicitly approves it

Profile, settings, and account management remain Phase 7. No separate dashboard surface is planned for v1.

## Current Starting Point

Phase 5 and Phase 5.1 left the app with:

- Supabase-backed Journal Timeline and Calendar views
- `JournalListEntry` view models
- `journal_entries` joined with `media_items`
- entry navigation back to Title Details
- a disabled `Add to List` action in Title Details
- placeholder `features/lists/components/ListsScreen.tsx`
- placeholder `features/lists/components/ListDetailsScreen.tsx`
- an existing Lists tab route at `app/(tabs)/lists.tsx`
- an existing Single List Details route at `app/lists/[id].tsx`

Phase 6 starts without:

- `lists` table migration
- `list_items` table migration
- generated Supabase types for lists
- list API helpers
- list query hooks
- list mutations
- Add to List integration

## Locked Product And Technical Direction

Phase 6 must follow the locked stack:

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

Phase 6 must follow the locked product rules:

- Lists are mixed-media by default.
- Journal remains management-focused.
- Profile / Account remains account-focused and deferred.
- Add/Edit Journal Entry remains the only core app modal route.
- Media metadata should come from normalized `media_items` records.
- External content APIs are not called directly from the client.
- Games remain deferred to v1.1, while list architecture should not break if a future `game` media item exists.

## Data Contract

Add the `lists` and `list_items` tables from `docs/database-schema.md`.

Recommended `lists` columns:

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null references profiles(id)
name text not null
description text null
is_default boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Required constraints and indexes:

- unique on `(user_id, name)`
- index on `(user_id, created_at desc)`

Recommended `list_items` columns:

```text
id uuid primary key default gen_random_uuid()
list_id uuid not null references lists(id) on delete cascade
media_item_id uuid not null references media_items(id)
position integer null
note text null
created_at timestamptz not null default now()
```

Required constraints and indexes:

- unique on `(list_id, media_item_id)`
- index on `(list_id, position)`
- index on `(list_id, created_at)`

RLS:

- users can select, insert, update, and delete only their own lists
- users can select, insert, update, and delete list items only for lists they own
- list item ownership should be enforced through the parent `lists.user_id`
- authenticated users can read normalized `media_items` as established by earlier phases

Delete behavior:

- deleting a list should remove its `list_items`
- deleting list items should not delete `media_items`

## List View Models

Use feature-owned list models instead of passing broad database join rows directly through UI components.

Recommended summary model:

```text
UserListSummary
  id string
  userId string
  name string
  description string | null
  isDefault boolean
  itemCount number
  coverItems ListCoverMedia[]
  createdAt string
  updatedAt string
```

Recommended cover media model:

```text
ListCoverMedia
  mediaItemId string
  title string
  mediaType MediaType
  imageUrl string | null
```

Recommended details model:

```text
UserListDetails
  id string
  userId string
  name string
  description string | null
  isDefault boolean
  itemCount number
  items UserListItem[]
  createdAt string
  updatedAt string
```

Recommended item model:

```text
UserListItem
  id string
  listId string
  mediaItemId string
  position number | null
  note string | null
  createdAt string
  media ListItemMedia
```

Recommended item media model:

```text
ListItemMedia
  id string
  source string
  sourceId string
  mediaType MediaType
  title string
  originalTitle string | null
  releaseDate string | null
  year string | null
  imageUrl string | null
  backdropUrl string | null
  genres string[]
  metadata Record<string, unknown>
```

If user ratings are shown on list items in the first pass, derive them from the current user's journal data in a focused helper or query. Do not make list management depend on fragile broad joins if a separate journal lookup is clearer.

## Query And Mutation Contract

Recommended query keys:

```text
userListsQueryKey(userId)
listDetailsQueryKey(userId, listId)
mediaListMembershipsQueryKey(userId, mediaItemId)
```

Recommended API helpers:

```text
features/lists/api/list-api.ts
  getUserLists(userId)
  getListDetails(userId, listId)
  getMediaListMemberships(userId, mediaItemId)
  createList(input)
  updateList(input)
  deleteList(input)
  addMediaItemToList(input)
  removeListItem(input)
  updateListItemNote(input)
```

Recommended hooks:

```text
features/lists/hooks/useUserLists.ts
features/lists/hooks/useListDetails.ts
features/lists/hooks/useListMutations.ts
features/lists/hooks/useMediaListMemberships.ts
```

Mutation invalidation:

- creating, updating, or deleting a list should refresh `userListsQueryKey(userId)`
- deleting a list should also invalidate any open list details query for that list
- adding or removing an item should refresh list details, list summaries, and media memberships for that media item
- updating a list item note should refresh list details

Duplicate behavior:

- duplicate list names should show calm validation or server-error copy
- adding a media item that is already in a list should be treated as already selected, not as a scary failure

## Lists Overview Contract

The Lists tab should replace the placeholder with a real overview.

Required content:

- header: `Lists`
- create list action
- list summary cards
- empty state when the user has no lists
- loading state
- error state with retry

List cards should show:

- list name
- optional description
- item count
- mixed-media cover collage or compact poster strip
- fallback visual when the list has no items

Tapping a list card should navigate to:

```text
/lists/[id]
```

## Single List Details Contract

The Single List Details screen should replace the placeholder with a real list view.

Required content:

- back behavior through the existing stack
- list name
- optional description
- item count
- edit list action
- add items action
- vertical list of media items
- empty state when the list has no items
- loading state
- error state with retry

List item rows/cards should show:

- poster or image fallback
- title
- year when available
- media type badge
- optional user rating when available without excessive query complexity
- optional note
- remove item action

Tapping a list item should navigate to Title Details using the same normalized route shape used by Search, Discover, Timeline, and Calendar.

## Create, Edit, And Delete List Flow

Create/edit should stay lightweight and screen-owned.

Recommended first-pass approach:

- use a feature-owned inline form panel or custom dialog component
- do not add a new Expo Router modal route unless explicitly approved
- support name and optional description
- validate required name
- trim name and description before save
- disable save while submitting
- show concise mutation errors

Delete behavior:

- delete should be clearly separated from save actions
- require confirmation
- successful delete returns the user to the Lists overview if they were on the deleted list details screen

## Add To List Contract

Title Details should enable the existing `Add to List` action once the current media item has a persisted `media_items.id`.

Recommended behavior:

- open a focused Add to List panel from Title Details
- show the user's lists with selected/unselected state for the current title
- allow adding the title to one or more lists
- allow removing the title from a list if it is already selected
- include a quick create-list path if it stays simple
- refresh memberships and list summaries after changes

The action should remain disabled or show a calm loading state while media details are still loading or the persisted media item ID is unavailable.

Do not call TMDB or any other third-party content API from the Add to List flow. It should use the normalized media item already returned by the app's media details flow.

## Optional List Item Notes

`list_items.note` is part of v1 and should be supported in Phase 6 if it stays manageable.

Recommended first pass:

- show notes on list item cards when present
- allow adding or editing a note from Single List Details
- keep note editing lightweight
- do not add long-form note behavior

If note editing threatens the core add/remove/list-management flow, finish the core flow first and leave note editing as the next Phase 6 step rather than expanding scope silently.

## State Contract

Unauthenticated state:

- follow existing auth/session patterns
- do not show fake list data

Loading state:

- use calm loading states consistent with Journal and Discovery

No lists state:

- invite the user to create their first list
- optionally mention examples like Favorites, Watch Next, or Best Endings

No list items state:

- make it clear the list is empty
- provide an action path toward adding items

Error state:

- show concise user-facing copy
- include retry where useful
- preserve useful developer detail in thrown errors

Mutation state:

- disable duplicate submits
- show errors inline where practical
- keep destructive actions visually distinct

## Navigation Contract

Existing routes should remain thin:

```text
app/(tabs)/lists.tsx
  -> features/lists/components/ListsScreen.tsx

app/lists/[id].tsx
  -> features/lists/components/ListDetailsScreen.tsx
```

List item navigation should reuse the existing Title Details route contract.

Do not create a parallel list-only title route.

## Component Structure

Likely new files:

```text
features/lists/api/list-api.ts
features/lists/components/AddToListPanel.tsx
features/lists/components/ListCard.tsx
features/lists/components/ListDetailsHeader.tsx
features/lists/components/ListForm.tsx
features/lists/components/ListItemCard.tsx
features/lists/hooks/useListDetails.ts
features/lists/hooks/useListMutations.ts
features/lists/hooks/useMediaListMemberships.ts
features/lists/hooks/useUserLists.ts
features/lists/model/listModels.ts
features/lists/types.ts
```

Likely updated files:

```text
app/(tabs)/lists.tsx
app/lists/[id].tsx
features/lists/components/ListsScreen.tsx
features/lists/components/ListDetailsScreen.tsx
features/media/components/TitleDetailsActions.tsx
features/media/components/TitleDetailsScreen.tsx
lib/supabase/types.ts
```

Likely new migration:

```text
supabase/migrations/<timestamp>_create_lists.sql
```

Add fewer files if a smaller component split stays readable.

## Implementation Sequence

### 1. Finalize Phase 6 Lists Contract

Expected outcome:

- this document exists
- Phase 6 boundaries are confirmed
- `lists` and `list_items` schema details are confirmed
- Add to List behavior is confirmed
- implementation sequence is agreed

Stop after this step and wait for explicit approval before implementing Step 2. After every later numbered step, stop again and wait for explicit approval before moving on.

### 2. Add `lists` And `list_items` Migration And RLS

Expected outcome:

- tables exist with constraints, indexes, timestamps, and RLS
- users can manage only their own lists
- users can manage only items inside lists they own
- deleting a list removes its items
- media metadata remains shared and is not deleted through list operations

### 3. Regenerate Supabase Types

Expected outcome:

- `lib/supabase/types.ts` includes `lists` and `list_items`
- list API helpers can use generated table types where useful

### 4. Define List Types And View Model Mapping

Expected outcome:

- feature-owned list summary, details, item, and media types exist
- Supabase rows are mapped into UI-friendly values
- list UI does not depend on raw broad database join rows
- malformed media/list values are handled clearly

### 5. Add List API Helpers And Query Hooks

Expected outcome:

- user lists can be fetched
- single list details can be fetched
- media list memberships can be fetched for Title Details
- create/update/delete list mutations exist
- add/remove item mutations exist
- optional note mutation exists if included in this step
- mutation invalidation refreshes relevant list and membership queries

### 6. Build Lists Overview Screen

Expected outcome:

- Lists placeholder is replaced with real Supabase-backed UI
- list cards render name, description, item count, and cover media
- loading, empty, and error states exist
- tapping a list opens Single List Details
- route file remains thin

### 7. Add Create, Edit, And Delete List Flow

Expected outcome:

- users can create a list from the Lists overview
- users can edit list name and description
- users can delete a list after confirmation
- duplicate names and validation errors are handled calmly
- deleted list details screens navigate back to the Lists overview

### 8. Build Single List Details Items View

Expected outcome:

- Single List Details placeholder is replaced with real UI
- list items render joined media metadata
- empty list state exists
- list item navigation opens Title Details
- users can remove items from a list
- optional notes are displayed and editable if included

### 9. Wire Add To List From Title Details

Expected outcome:

- Title Details `Add to List` action is enabled when a persisted media item exists
- Add to List panel shows user lists and membership state
- users can add the current title to lists
- users can remove the current title from lists
- memberships and list summaries refresh after changes
- no direct third-party API calls are introduced

### 10. Polish Lists States And UX

Expected outcome:

- overview, details, and Add to List states feel consistent
- touch targets are comfortable
- destructive actions are clearly separated
- text fits on mobile and desktop web
- empty states guide the next useful action
- duplicate add/remove behavior is calm

### 11. Verify Phase 6

Expected outcome:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run check` passes when environment permissions allow
- no client code calls TMDB directly
- users can create, edit, and delete lists
- users can open list details
- users can add a title to a list from Title Details
- users can remove a title from a list
- optional list item notes work if implemented

## Acceptance Criteria

Phase 6 is complete when:

1. `docs/phase-6-lists.md` exists.
2. `lists` and `list_items` exist with constraints, indexes, RLS, and generated TypeScript types.
3. Lists overview uses real Supabase-backed list data.
4. Users can create a list.
5. Users can edit a list.
6. Users can delete a list.
7. Users can open Single List Details.
8. Single List Details shows joined normalized media metadata for list items.
9. Users can add titles to lists from Title Details.
10. Users can remove titles from lists.
11. Optional `list_items.note` is supported or explicitly deferred within Phase 6.
12. Lists remain mixed-media by default.
13. Profile / Account remains deferred to Phase 7.
14. No direct TMDB client calls are introduced.
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

- Open Lists with no lists and confirm the empty state.
- Create a list with a valid name.
- Try creating a duplicate list name and confirm calm error handling.
- Edit list name and description.
- Delete a list and confirm list items are removed.
- Open Title Details for a persisted title.
- Add the title to one list.
- Add the title to multiple lists.
- Remove the title from a list through Add to List.
- Open Single List Details and confirm the item appears.
- Tap a list item and confirm Title Details opens.
- Remove an item from Single List Details.
- Add or edit an item note if note editing is implemented.
- Confirm mixed media can coexist in one list.
- Confirm no app/client file contains direct TMDB URLs or credentials.

## Handoff To Phase 7

Phase 6 should leave Phase 7 with:

- user-created mixed-media lists
- stable list data ready for future account or quality-hardening work
- Title Details Add to List integration
- stable list query keys and mutations

Phase 7 can then build Profile / Account without reworking list ownership or list item data.
