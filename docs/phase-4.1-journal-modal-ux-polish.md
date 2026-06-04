# Phase 4.1 Journal Modal UX Polish

## Purpose

Phase 4.1 refines the Add/Edit Journal Entry modal after the Phase 4 CRUD flow is working.

This phase should make the modal feel intentional, mobile-ready, and production-minded without expanding the product scope into Journal Timeline, Calendar, Lists, Dashboard, Profile, or Settings work.

## Phase Goal

Improve the interaction quality of the journal entry modal.

By the end of Phase 4.1:

- The modal should have a polished dismiss control that matches the app's visual language.
- The review text area should remain usable when the mobile keyboard is open.
- Delete confirmation should use an app-designed destructive confirmation experience instead of a generic native alert.
- The spoiler control should feel integrated with the form.
- The rating input should clearly communicate how users can set and clear a rating.
- Modal dismissal behavior should be predictable across iOS, Android, and web.

## Non-Goals

Do not implement unrelated product work in Phase 4.1.

Specifically, do not implement:

- Journal Timeline view
- Journal Calendar view
- journal filtering and sorting
- Dashboard personalization
- list creation
- Add to List behavior
- list selection inside the journal entry modal
- profile stats
- settings or account-management flows
- new external media providers
- direct TMDB calls from the client

## Current Starting Point From Phase 4

Phase 4 left the app with:

- a product Title Details screen
- a working Add/Edit Journal Entry modal route
- journal entry create, update, and delete mutations
- title-specific `Your Entry` state
- Supabase-backed `journal_entries`
- generated database types
- a first-pass custom rating input
- a generic modal `Close` text button
- a native delete confirmation alert
- a default switch-based spoiler control
- review field keyboard behavior that still needs mobile verification and polish

## Locked Product And Technical Direction

Phase 4.1 must continue to follow the locked stack:

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

Phase 4.1 must preserve the locked product rules:

- Add/Edit Journal Entry remains a modal flow.
- Reviews remain short-form.
- Rating remains a `0.5` to `5.0` scale.
- The first v1 rating input remains slider-based unless device testing proves the current control is not viable.
- Add to List remains Phase 6.
- Journal Timeline and Calendar remain Phase 5.

## UX Decisions To Confirm

Phase 4.1 should confirm these before coding:

1. The modal dismiss control should become an icon-style button with an accessible label, not a text-only `Close` button.
2. Delete confirmation should be a custom in-app confirmation surface owned by the journal feature.
3. The spoiler control should be redesigned as a form row or selectable card-style control, not a plain settings switch row.
4. Keyboard avoidance should be implemented in the modal frame, not repeated in individual fields.
5. Rating input copy and visuals should make tap, drag, and clear behavior understandable.
6. Gesture dismiss should be attempted only if it remains reliable with the current Expo Router modal setup and does not interfere with form scrolling or rating input gestures.

## Implementation Sequence

### 1. Finalize Phase 4.1 Contract

Expected outcome:

- this document exists
- Phase 4.1 scope is confirmed as modal UX polish only
- non-goals are confirmed
- UX decisions are confirmed or adjusted before implementation
- acceptance criteria are agreed

Stop after this step and wait for explicit approval before implementing Step 2.

### 2. Polish Modal Header And Dismiss Control

Expected outcome:

- replace the generic `Close` text button with an intentional dismiss control
- preserve accessible labeling
- keep back/close behavior predictable
- avoid changing the journal CRUD data flow

### 3. Add Keyboard-Aware Modal Layout

Expected outcome:

- review text area remains visible and usable while typing on mobile
- modal content scrolls naturally when the keyboard is open
- sticky actions remain reachable where practical
- behavior is verified on a mobile device or emulator before considering the step complete

### 4. Replace Delete Alert With Custom Confirmation

Expected outcome:

- delete entry uses an in-app destructive confirmation UI
- confirmation copy is clear and calm
- cancel and delete actions are visually distinct
- mutation loading and errors still work correctly

### 5. Redesign Spoiler Control

Expected outcome:

- spoiler toggle feels integrated with the journal form
- selected and unselected states are visually clear
- the control remains accessible
- the stored `contains_spoilers` behavior does not change

### 6. Improve Rating Input Affordance

Expected outcome:

- rating input communicates the current value clearly
- users can understand how to set the rating
- clearing a rating remains available
- the control still uses `0.5` increments from `0.5` to `5.0`
- no new slider dependency is added unless the existing custom control proves inadequate during testing

### 7. Evaluate Gesture Dismiss

Expected outcome:

- determine whether swipe or drag dismiss is reliable with the current modal setup
- implement it only if it does not conflict with scrolling, keyboard usage, or rating input gestures
- document the decision if gesture dismiss is deferred

Decision:

- Deferred for Phase 4.1. The modal already contains vertical scrolling, keyboard-aware resizing, and a draggable rating control, so adding a competing drag-to-dismiss gesture is not worth the interaction risk in this polish pass.

### 8. Verify Phase 4.1

Expected outcome:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run check` passes when environment permissions allow
- create, edit, and delete journal entry flows still work
- keyboard behavior is manually verified on mobile device or emulator
- modal dismiss behavior is manually verified on iOS, Android, and web where available
- no client code calls TMDB directly

## Acceptance Criteria

Phase 4.1 is complete when:

1. The journal entry modal no longer uses a generic text-only `Close` button.
2. The review text area is usable while the mobile keyboard is open.
3. Delete entry confirmation uses an app-designed destructive confirmation flow.
4. The spoiler control has a polished integrated form treatment.
5. The rating input clearly communicates set, adjust, and clear behavior.
6. The modal can be dismissed predictably without losing successful save/delete behavior.
7. Create, edit, and delete journal entry mutations still work.
8. Phase 5 Journal Timeline and Calendar remain unimplemented.
9. Phase 6 Add to List behavior remains unimplemented.
10. No direct TMDB client calls are introduced.
11. `npm run typecheck` passes.
12. `npm run lint` passes.
13. `npm run check` passes when environment permissions allow.

## Verification Checklist

Run:

```text
npm run typecheck
npm run lint
npm run check
```

Manual checks:

- Open a title from Search.
- Open a title from Discover.
- Open Add Journal Entry.
- Dismiss the modal from the new control.
- Create an entry with status, rating, headline, review body, and spoiler state.
- Reopen the entry and edit it.
- Focus the review text area on a mobile device or emulator and confirm the keyboard does not cover the active writing area.
- Clear and reset a rating.
- Toggle spoilers on and off.
- Delete the entry through the custom confirmation flow.
- Confirm Title Details `Your Entry` updates after create, edit, and delete.

## Handoff To Phase 5

Phase 5 should begin only after the journal entry modal feels reliable enough to be the primary creation and editing surface.

Phase 5 can then build:

- Journal screen shell
- Timeline view
- Calendar view
- filters for media type, status, and rating
- sorting controls
- connected journal list queries

Phase 4.1 should leave Phase 5 with the same journal data model and mutations from Phase 4, plus a more polished modal UX.
