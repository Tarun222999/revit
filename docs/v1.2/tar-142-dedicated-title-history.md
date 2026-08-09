# TAR-142: Dedicated Title History Page

## Document Status

- Status: Approved product direction
- Version: v1.2
- Related issue: [TAR-142](https://linear.app/tarun495/issue/TAR-142/may-be-history-needs-a-new-page-or-modal)
- Implementation: Not approved
- Last updated: August 10, 2026

This document defines the approved product direction for moving a title's full
Journal history out of Title Details and into a dedicated pushed page. It does
not authorize code, schema, migration, or tracker changes. Implementation
requires separate explicit approval and must follow the ordered plan in
`docs/v1.2/tar-142-dedicated-title-history-implementation.md`.

## Goal

Keep Title Details focused and useful while allowing a title to support many
separate watches and other dated Journal events.

A person who has watched the same movie ten times should be able to review and
manage those records without turning Title Details into a long edit-and-delete
surface.

## Problem

The current `View history` action expands the complete history inline inside
Title Details. Each event includes its date, rating, Notes, and permanently
visible edit and delete actions.

This works for one or two records but degrades as history grows:

- unrelated title metadata is pushed far below the Journal content;
- Title Details becomes a record-management screen rather than a title summary;
- every event adds two visible buttons, creating excessive visual weight;
- returning from an event edit can lose the person's place in a long page; and
- the inline layout does not provide a clean boundary for pagination and list
  virtualization.

Repeated watches are a core part of the approved Journal model, so several
history records are normal product data rather than an edge case.

## Approved Product Decision

`View history` pushes a dedicated History page onto the navigation stack.

History must not:

- expand inside Title Details;
- open as a partial-height modal or bottom sheet; or
- duplicate the complete history on both surfaces.

The normal Back action returns to the same Title Details page. Opening and
closing an event-edit modal returns to the History page rather than skipping
back to Title Details.

## Title Details After This Change

Title Details retains the compact `Your Journal` summary and the existing
state-aware actions.

When history exists, the summary can show:

- current Journal state;
- active plan, when present;
- completed watch count;
- latest completed watch date;
- latest rating, including `Not rated`; and
- a short preview of the latest Notes, when present.

`View history` remains the entry point for the complete record. Depending on
the title state, it can remain the secondary action or appear under More actions
according to the existing title-action model.

Title Details must not fetch or render the full history until the person asks
to view it.

## Dedicated History Page

### Navigation and header

The page uses a normal pushed-screen header with:

- Back navigation;
- the screen title `Watch history`; and
- the media title as supporting context.

The page is private Journal content and is available only to the signed-in
owner. It is not a public or shareable title route.

### Compact title summary

The top of the page shows enough title context to prevent confusion without
recreating Title Details:

- poster artwork;
- media title;
- latest completed watch date, when one exists; and
- total completed watch count.

This is a compact orientation row, not another full `Your Journal` card.

### Add previous watch

An `Add previous watch` action appears near the top of the page. It opens the
existing focused Journal form for a backdated completed event.

Adding a previous watch:

- creates a separate dated event;
- preserves every existing event;
- preserves a future active plan; and
- returns to History after a successful save or cancellation.

### History list

History is shown in reverse chronological order and never merges separate
rewatches.

Each row shows:

- a precise event label such as `Watched`, `Rewatched`, `Started watching`, or
  `Stopped watching`;
- the user-selected event date;
- the rating belonging to that completed event, when present; and
- a concise Notes preview, when present.

The first completed watch is labeled `Watched`. Later completed watches are
labeled `Rewatched`. Start and stop events retain their own event labels.

The list uses bounded, paginated loading. A long history must not require every
event to be fetched or rendered at once.

### Per-event actions

Each row has one accessible overflow action instead of permanently displaying
two equal-weight buttons.

The overflow menu contains:

- `Edit watch` or the matching event-specific edit label; and
- `Delete watch` or the matching event-specific delete label.

Editing changes only the selected event. Deleting changes only the selected
event unless it is the final event and the existing final-event decision is
required.

The established deletion consequences remain unchanged:

- deleting one event preserves other history and any active plan;
- deleting the final event without an active plan requires a choice between
  keeping the title in Someday and removing it from Journal; and
- removing the complete Journal title remains a distinct action outside the
  row menu.

## Navigation and Restoration

- Back from History returns to the originating Title Details page.
- Opening an event edit uses the existing focused Journal modal.
- Successful editing returns to History and refreshes the changed row.
- Cancelling or discarding an edit returns to History without changing data.
- History retains its loaded pages and approximate scroll position across the
  edit-modal round trip.
- Returning from History to Title Details preserves the normal Title Details
  navigation context.

## Loading, Empty, and Error States

- Title context and Journal summary use explicit loading states.
- A title with no dated activity shows a calm empty state explaining that the
  first completed watch creates history, plus `Add previous watch` when valid.
- A failed history request is not treated as an empty history.
- A failed later page keeps already loaded events visible and offers Retry.
- A missing or removed Journal title shows a clear unavailable state and a Back
  action rather than attempting to create data automatically.
- Mutation failures preserve the current row and entered form data.

## Accessibility Requirements

- Back, Add previous watch, and every overflow action have descriptive labels
  and comfortable mobile touch targets.
- Overflow buttons announce the event and date they control.
- Menus expose clear expanded and collapsed states.
- Event labels, dates, ratings, and Notes remain readable with large text.
- Edit and delete actions are distinguishable without relying on color alone.
- Destructive confirmations use modal semantics, safe focus behavior, and a
  non-destructive default action.
- Loading, successful changes, and failures are announced where appropriate.

## Technical Direction

- Use an Expo Router pushed route under the existing title route identity.
- Keep the route file thin and place the screen and row UI in the Journal
  feature.
- Resolve private history from the authenticated user and existing normalized
  media/title state. Do not place a user ID or Journal entry ID in a public
  share contract.
- Reuse the existing title summary, paginated history query, focused Journal
  form intents, event mutations, and targeted query invalidation.
- Render the event collection with a virtualized React Native list.
- Do not add or change database tables, lifecycle RPCs, or generated database
  types for this presentation change.

## Out of Scope

- Changing the Journal event schema or title-state model
- Merging repeated watches into one record
- Episode- or season-level progress
- Searching, filtering, or sorting one title's history
- Sharing or publishing private History
- Adding reactions, comments, or social activity
- Redesigning Timeline, Planner, Calendar, or Title Details beyond removing the
  inline history surface
- Replacing every unrelated Journal confirmation or alert

## Acceptance Criteria

1. `View history` pushes a dedicated History page instead of expanding content
   inside Title Details.
2. Back returns from History to the same Title Details page.
3. Title Details retains a compact Journal summary and does not render the full
   history.
4. The History page shows poster, title, latest completed date, and total watch
   count without duplicating the full Title Details layout.
5. Ten or more watches remain readable without ten pairs of permanently visible
   edit and delete buttons.
6. Events are ordered by user-selected event date in reverse chronological
   order with stable tie-breaking.
7. Separate rewatches remain separate rows and retain their own rating and
   Notes.
8. The first completed watch is labeled `Watched`; later completions are
   labeled `Rewatched`.
9. Start and stop events keep precise event-specific labels.
10. Each row provides accessible overflow actions for editing and deleting that
    exact event.
11. Editing one event does not overwrite another event or change an active plan.
12. Deleting one event preserves other events and uses the established final-
    event decision when applicable.
13. `Add previous watch` creates a backdated event without resolving a future
    active plan.
14. History uses bounded pagination and a virtualized list.
15. Editing and returning preserve loaded history and the person's approximate
    scroll position.
16. Initial-loading, empty, first-page failure, later-page failure, and mutation
    failure states are distinct.
17. Signed-out or non-owning users cannot view another person's History.
18. No schema, migration, lifecycle RPC, or generated database type changes are
    required.

