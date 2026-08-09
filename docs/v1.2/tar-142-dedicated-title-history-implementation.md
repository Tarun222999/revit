# TAR-142: Dedicated Title History Page Implementation Plan

## Document Status

- Status: Approved through Step 1
- Version: v1.2
- Product direction: Approved in
  `docs/v1.2/tar-142-dedicated-title-history.md`
- Related issue: [TAR-142](https://linear.app/tarun495/issue/TAR-142/may-be-history-needs-a-new-page-or-modal)
- Implementation: Step 1 complete; Step 2 requires separate approval
- Last updated: August 10, 2026

This document proposes the ordered implementation for TAR-142. Step 1 was
explicitly approved and completed on August 10, 2026. Later steps do not have
approval and must proceed one step at a time after separate explicit approval.

## Objective

Replace the current inline Title Details history expansion with a dedicated,
private, pushed History page that scales to many events while preserving all
approved v1.1 Journal behavior.

## Current State

The underlying data and lifecycle work already exists:

- `useJournalTitleSummary` loads the owner-scoped title summary;
- `useJournalHistory` loads reverse-chronological event pages;
- history pages use a bounded cursor contract;
- the focused Journal modal supports `previous_watch` and `edit_event` intents;
- event edits and deletions use existing lifecycle mutations; and
- mutations invalidate the affected title summary, History, Timeline, Planner,
  and Calendar reads.

The presentation currently has the scaling problem:

- `TitleDetailsScreen` owns a local `showHistory` boolean;
- `View history` toggles that boolean through
  `TitleDetailsJournalActions.onToggleHistory`;
- `JournalHistoryPanel` is inserted into the scrollable Title Details content;
- every loaded event renders `Edit activity` and `Delete activity` buttons; and
- the event collection is mapped into a normal `View` rather than owning a
  virtualized page-level list.

No database or server contract gap is known for this feature.

## Route and Ownership Contract

Add a pushed route using the existing title route identity:

```text
/title/[id]/history
```

The `[id]` segment follows the same encoded media route-ID contract as Title
Details. Navigation must not expose or trust a user ID from route parameters.

The History screen resolves data in this order:

1. authenticated user;
2. normalized media item from the title route ID;
3. owner-scoped Journal title summary from the media item ID; and
4. owner-scoped event pages from the resolved Journal title-state ID.

The route is private. A direct signed-out visit follows the existing protected
navigation behavior and must not render cached private history before the auth
state is known.

## Proposed Component Shape

Keep the route thin and introduce focused Journal-owned components:

```text
app/title/[id]/history.tsx
features/journal/components/JournalHistoryScreen.tsx
features/journal/components/JournalHistoryHeader.tsx
features/journal/components/JournalHistoryRow.tsx
features/journal/components/JournalHistoryEventMenu.tsx
```

Exact component boundaries may be reduced when a separate file would not add
clarity. The required ownership boundary is that the route delegates to a
Journal feature screen and Title Details no longer renders the complete list.

## Data and List Behavior

The screen reuses `useJournalHistory`. It should flatten loaded pages for a
`FlatList` or equivalent virtualized React Native list and use stable event IDs
as keys.

Required behavior:

- reverse-chronological event ordering remains controlled by the existing read
  API;
- later pages append without replacing already loaded events;
- the list prevents duplicate load-more requests while a page is pending;
- a later-page error retains existing rows and offers Retry;
- edits update the matching cached/read event after normal invalidation; and
- deletions remove the confirmed event without showing stale duplicates during
  refetch.

The History screen must not be placed inside another vertical `ScrollView`.
Header summary, Add previous watch, initial states, and pagination controls can
be composed through the virtualized list's header, footer, and empty-state
slots.

## Event Labels

Extract or reuse one deterministic event-label helper so History and Timeline
cannot drift.

- `started` becomes `Started watching`;
- `stopped` becomes `Stopped watching`;
- the earliest completed event becomes `Watched`; and
- later completed events become `Rewatched`.

Rewatch inference must remain correct across pagination. It cannot assume that
the earliest completion is present in the first loaded page. Use the summary's
total completed-watch count and the ordered completed-event position, or add
the smallest read-model metadata needed without changing the database schema.

## Navigation Changes

### Title Details

- Replace `onToggleHistory` with an explicit `onOpenHistory` callback.
- Push `/title/[id]/history` for both secondary and More-menu History actions.
- Remove `showHistory`, its toggle logic, and inline `JournalHistoryPanel`
  rendering.
- Keep `YourJournalSummary`, title actions, Add to List, and metadata order
  otherwise unchanged.

### History actions

- `Add previous watch` opens `/modals/journal-entry` with the existing
  `previous_watch` intent and `source: 'history'`.
- Edit opens the same modal with `intent: 'edit_event'`, the selected event ID,
  media item ID, and `source: 'history'`.
- Cancel, discard, and successful save pop only the modal and reveal History
  underneath.
- Back from History pops to Title Details.

Do not replace the route with Title Details after a mutation. Normal query
invalidation refreshes the History screen in place.

## Overflow and Delete Behavior

Each History row gets one accessible overflow trigger. Only one row menu should
be expanded at a time. Opening Edit or Delete closes the menu.

Reuse the existing lifecycle mutation and deletion consequences. Prefer the
existing app-owned `JournalActionConfirmation` where its contract fits, with
event-specific copy and safe cancellation. Do not broaden TAR-142 into a global
confirmation rewrite.

Delete states:

- ordinary event: confirm deletion and preserve other events and plans;
- final event with an active plan: delete only the event and keep the plan;
- final event without an active plan: require `Keep in Someday` or
  `Remove title`; and
- pending delete: disable duplicate row actions until the mutation settles.

Failure keeps the row visible and presents app-owned, contextual feedback.

## Restoration Strategy

The pushed screen naturally remains mounted while the Journal form modal is
open. Preserve:

- the infinite-query pages already loaded;
- the virtualized list's current offset or nearest visible event; and
- the route beneath the modal.

Do not clear History query data or replace the History route when opening an
edit. After success, allow targeted invalidation to refresh the changed data
without forcing the list to the top.

If deletion removes the currently visible anchor row, restore to the nearest
remaining row rather than resetting the entire screen.

## Error and Auth Boundaries

- Auth loading blocks private reads and private-content rendering.
- A signed-out state uses the existing protected-route behavior.
- Media resolution failure shows a title-context error with Retry or Back.
- A successful title read with no Journal summary shows History unavailable;
  it does not silently create a Journal title.
- First-page history failure shows a full History error state with Retry.
- Later-page failure stays in the list footer and preserves loaded rows.
- Edit and delete failures preserve data and context.

## Testing Direction

Add focused tests at the smallest stable boundaries:

- action-model and Title Details navigation tests;
- route parameter and auth-boundary tests;
- History screen loading, empty, error, and populated states;
- ten-event rendering through a virtualized list;
- pagination success, duplicate-load prevention, and later-page retry;
- first-watch and rewatch labels across page boundaries;
- row overflow accessibility and single-open-menu behavior;
- add-previous-watch and edit-event modal parameters;
- ordinary and final-event deletion consequences;
- mutation failure preservation; and
- modal return and scroll/list restoration.

Manual verification should cover iOS and Android Back behavior, large text,
screen-reader labels, overflow positioning near screen edges, and a title with
at least ten completed watches.

## Non-Goals

- Schema, migration, RLS, lifecycle RPC, or generated type changes
- New History search, filter, or sort controls
- Episode and season progress
- Public or shared History routes
- Timeline, Planner, or Calendar redesign
- A general refactor of all Title Details actions
- Replacing unrelated native alerts throughout the app

## Implementation Sequence

Do not begin a later step until the user explicitly approves proceeding to it.

1. **Add the pushed route and change the navigation boundary** - Create the
   thin History route and screen shell, change `View history` to push it, and
   remove the inline Title Details expansion. Preserve the existing Journal
   summary and action model. Stop for review.
2. **Build the scalable History list** - Move/refactor the history presentation
   into a virtualized page-level list with compact title context, precise event
   labels, bounded pagination, initial and later-page states, and one overflow
   trigger per row. Stop for review.
3. **Wire History actions and restoration** - Connect Add previous watch, event
   edit, event delete, final-event decisions, mutation feedback, modal return,
   and scroll/list restoration. Stop for review.
4. **Complete verification and record completion** - Run focused and full
   repository verification, perform the iOS/Android accessibility and long-list
   checks, resolve regressions within scope, and update implementation tracking.
   Stop for final approval.

## Acceptance Mapping

| Product requirement | Primary implementation step |
| --- | --- |
| Pushed History route; no inline expansion | Step 1 |
| Compact title context and virtualized event list | Step 2 |
| Reverse chronology and correct event labels | Step 2 |
| Bounded pagination and distinct error states | Step 2 |
| Accessible per-row overflow menu | Step 2 |
| Add previous watch and event editing | Step 3 |
| Event deletion and final-event decision | Step 3 |
| Modal return and list-position preservation | Step 3 |
| Cross-platform, accessibility, and regression verification | Step 4 |

## Verification Matrix

| Area | Required checks |
| --- | --- |
| Navigation | View history pushes; Back returns; edit modal returns to History |
| Privacy | No private read before auth; only the owner can load History |
| Data | Existing summary and paginated History contracts remain authoritative |
| List | Ten-plus events virtualize; pages append once; later errors preserve rows |
| Labels | First completion is Watched; later completions are Rewatched across pages |
| Actions | Add, edit, ordinary delete, final delete, cancel, and failure paths |
| Restoration | Loaded pages and approximate position survive edit-modal round trips |
| Accessibility | Large text, screen-reader labels, menu state, touch targets, confirmations |
| Regression | Title summary/actions, Timeline, Planner, Calendar, Lists, and cache invalidation |

## Step 1 Completion Record

Completed August 10, 2026 after explicit Step 1 approval.

- Added the private pushed route `/title/[id]/history`.
- Registered the route in the root Expo Router stack with the `Watch history`
  title.
- Changed Title Details `View history` actions to push the new route.
- Removed the inline `showHistory` state and History panel from Title Details.
- Added a Journal-owned History screen shell that resolves the existing title
  summary and reuses the current History panel while the scalable list remains
  in Step 2.
- Preserved existing event editing through the History source and existing
  Journal modal.
- Passed focused navigation/component tests, TypeScript typechecking, and lint.

## Implementation Tracking

| Step | Status | Notes |
| --- | --- | --- |
| 1. Route and navigation boundary | Complete | Pushed route, root stack registration, Title Details navigation boundary, and History screen shell completed August 10, 2026; focused tests, typecheck, and lint passed |
| 2. Scalable History list | Not started | Blocked by Step 1 approval and completion |
| 3. Actions and restoration | Not started | Blocked by Step 2 approval and completion |
| 4. Verification and completion | Not started | Blocked by Step 3 approval and completion |
