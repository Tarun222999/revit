# Phase 6.1 Lists UX Polish

## Purpose

This document defines a focused polish phase for Lists after Phase 6 and before Phase 7.

Phase 6 made Lists functionally complete. Phase 6.1 should make the Lists experience feel intentional, clear, and production-ready before Profile / Account work starts.

## Phase Goal

Polish the mixed-media Lists UX.

By the end of Phase 6.1:

- creating a list should take the user directly into the new List Details screen
- Lists overview should focus on browsing and creating lists
- list name and description editing should happen inside List Details
- List Details should have clearer header, empty, and item-note actions
- Title Details `Add to List` should open a component-level bottom sheet or panel
- Add to List should use saved-style selected and unselected affordances instead of vague add/remove labels
- users should be able to quickly create a list inside Add to List
- Lists should remain mixed-media by default
- Profile / Account work should remain deferred to Phase 7

## Why This Phase Exists

User QA found that Lists works, but several interactions still feel awkward or unclear:

- after creating a list, the user stays on the overview instead of landing in the new list
- `Manage List` on List Details is unclear
- the List Details empty state copy is incomplete
- editing a list from the top of the Lists overview feels like an admin form
- Add to List from Title Details feels too inline and form-like
- Add/Remove buttons do not communicate a saved-to-list state well
- users with no lists are told to leave the flow and come back later
- list item note actions are vague
- the custom List Details `Back` button is visually weak and redundant

Phase 6.1 should fix these issues without changing the product model.

## Locked Product And Technical Direction

Phase 6.1 must follow the locked stack:

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

Phase 6.1 must follow the locked product rules:

- Lists are mixed-media by default.
- Journal remains management-focused.
- Profile / Account remains account-focused and deferred to Phase 7.
- Add/Edit Journal Entry remains the only core app modal route.
- Add to List can use a component-level bottom sheet or panel.
- Do not introduce a new Expo Router modal route unless necessary and explicitly approved.
- Media metadata should come from normalized `media_items` records.
- External content APIs are not called directly from the client.
- Games remain deferred to v1.1.

## Non-Goals

Do not implement unrelated product work in Phase 6.1.

Specifically, do not implement:

- Profile / Account
- dashboard or home personalization
- public lists
- list sharing
- comments, likes, follows, or other social features
- recommendations
- manual drag-and-drop list ordering
- game provider integration
- direct TMDB calls from the client
- new external content provider behavior
- schema changes unless a bug makes one unavoidable
- a new core modal route for Add to List

## UX Contract

### Lists Overview

The Lists overview should be a browse-and-create surface.

Required behavior:

- show existing list cards
- keep the create-list entry point
- remove edit-list behavior for existing lists from the overview
- after successful list creation, navigate to the new list details route:

```text
/lists/[id]
```

The overview should not feel like a list administration dashboard.

### List Details

List Details should be the management surface for one specific list.

Required behavior:

- remove the custom in-screen `Back` button and rely on native/header navigation
- remove the unclear `Manage List` action
- add list name and description editing inside List Details
- keep delete behavior clearly separated from normal edit/save actions
- fix the broken empty state copy
- make empty guidance clear and useful
- keep Add Items guidance aligned with the existing app flow

Recommended empty state direction:

- title: `No titles yet`
- body: explain that titles saved to this list will appear here
- action or guidance: point users toward adding titles from Title Details

Exact copy can be refined during implementation as long as it is complete, calm, and not awkward.

### List Item Notes

List item note actions must be explicit.

Required behavior:

- replace vague `Add` note action copy with `Add Note`
- when a note exists, use `Edit Note`
- keep the note action visually smaller than destructive or primary navigation actions
- keep remove behavior clearly destructive

### Add To List From Title Details

Add to List should feel like saving a title to collections.

Required behavior:

- open a focused component-level bottom sheet or panel from Title Details
- use a visual treatment similar in feel to the Add/Edit Journal Entry bottom panel
- show all user lists with selected and unselected states
- replace `Add` and `Remove` button labels with saved-style check affordances
- selected state should use a rounded filled/check control
- unselected state should use a rounded outlined/empty check control
- preserve clear accessibility labels even if visible copy is icon-first
- avoid direct third-party API calls

If the user has no lists:

- do not tell them to leave and come back
- show quick list creation inside the Add to List panel

If the user already has lists:

- still offer a lightweight `New List` action inside the panel
- after quick creation, keep the user in the Add to List flow and make the new list available for selection

## Relevant Files

Likely updated files:

```text
features/lists/components/ListsScreen.tsx
features/lists/components/ListDetailsScreen.tsx
features/lists/components/ListCard.tsx
features/lists/components/ListForm.tsx
features/lists/components/ListItemCard.tsx
features/lists/components/AddToListPanel.tsx
features/media/components/TitleDetailsActions.tsx
features/media/components/TitleDetailsScreen.tsx
```

Add fewer files if the existing components remain readable. Add small feature-owned components only when they make the Lists code clearer.

## Implementation Sequence

### 1. Finalize Phase 6.1 Lists UX Polish Contract

Expected outcome:

- this document exists
- Phase 6.1 is confirmed as the next phase before Phase 7
- UX changes and non-goals are confirmed
- implementation sequence is agreed

Stop after this step and wait for explicit approval before implementing Step 2. After every later numbered step, stop again and wait for explicit approval before moving on.

### 2. Move Create Success Navigation

Expected outcome:

- creating a list from the Lists overview still starts from the overview
- successful creation navigates directly to the new List Details screen
- create errors remain visible and calm
- list query invalidation still refreshes overview data

### 3. Move Edit List Flow Into List Details

Expected outcome:

- existing list name and description editing is removed from the Lists overview
- List Details owns editing for its list name and description
- `Manage List` is removed
- delete behavior remains available but clearly separated
- route files remain thin

### 4. Polish List Details Empty And Header UI

Expected outcome:

- custom in-screen `Back` button is removed
- native/header navigation remains usable
- incomplete empty copy is fixed
- empty state clearly explains what belongs in the list
- Add Items guidance is understandable without sending users into a dead end

### 5. Rework List Item Note Action

Expected outcome:

- vague `Add` note action is replaced with `Add Note`
- items with existing notes show `Edit Note`
- note action is visually secondary
- remove action remains clearly destructive

### 6. Convert Add To List Into Bottom-Sheet Style UI

Expected outcome:

- Title Details opens Add to List as a focused bottom sheet or bottom panel
- UI feels visually related to the Add/Edit Journal Entry bottom panel
- all user lists are shown with current membership state
- Add/Remove buttons are replaced with saved-style rounded check controls
- selected and unselected states are clear
- accessibility labels communicate whether the title is saved to each list
- no direct TMDB or other third-party client calls are introduced

### 7. Add Quick Create List Inside Add To List

Expected outcome:

- users with no lists can create their first list without leaving the Add to List flow
- users with existing lists can open a lightweight `New List` action
- newly created lists appear in the sheet without requiring a manual refresh
- the title can be saved to the newly created list
- validation and duplicate-name errors stay calm and inline

### 8. Verify Phase 6.1

Expected outcome:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run check` passes when environment permissions allow
- no client code calls TMDB directly
- manual QA confirms the polished flows with an authenticated user and real list data

## Acceptance Criteria

Phase 6.1 is complete when:

1. `docs/phase-6.1-lists-ux-polish.md` exists.
2. Creating a list navigates directly to that list's details screen.
3. Lists overview no longer edits existing list metadata.
4. List Details owns list name and description editing.
5. `Manage List` is removed.
6. The custom in-screen List Details `Back` button is removed.
7. List Details empty state copy is complete and useful.
8. List item note actions say `Add Note` or `Edit Note`.
9. Add to List opens as a component-level bottom sheet or panel.
10. Add to List uses saved-style selected and unselected check controls.
11. Users can create a list inside Add to List.
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

- Open Lists with no lists and confirm overview empty state still invites creation.
- Create a list and confirm the app navigates to `/lists/[id]`.
- Return to Lists overview and confirm existing list editing is not shown there.
- Open List Details and edit the list name and description there.
- Confirm `Manage List` is gone.
- Confirm the custom in-screen `Back` button is gone.
- Open an empty list and confirm the empty state copy is complete.
- Add a note to a list item and confirm the action says `Add Note`.
- Edit an existing note and confirm the action says `Edit Note`.
- Open Title Details for a persisted title and tap Add to List.
- Confirm Add to List opens as a bottom sheet or bottom panel.
- Confirm selected and unselected list states use rounded check controls.
- With no lists, create a list inside Add to List and save the title to it.
- With existing lists, create another list from the Add to List sheet.
- Confirm adding and removing list membership refreshes details and overview state.
- Confirm mixed media can still coexist in one list.
- Confirm no app/client file contains direct TMDB URLs or credentials.

## Handoff To Phase 7

Phase 6.1 should leave Phase 7 with:

- polished mixed-media list creation and details flows
- list metadata editing in the correct screen
- clearer list item note actions
- a more natural saved-to-list interaction from Title Details
- quick list creation available where users need it
- stable list data ready for future account or quality-hardening work

Phase 7 can then build Profile / Account without reworking the Lists UX model.
