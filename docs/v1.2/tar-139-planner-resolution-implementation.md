# TAR-139: Planner Resolution and Confirmation Hardening

## Document Status

- Status: Approved implementation proposal
- Version: v1.2
- Related issue: [TAR-139](https://linear.app/tarun495/issue/TAR-139/planner-is-brokendelete-is-not-working-native-delete-model)
- Implementation: Steps 1–2 complete; Step 3 requires separate approval
- Last updated: August 9, 2026

This document records the proposed implementation for TAR-139. It does not
authorize code, schema, migration, or tracker changes. Implementation may
begin only after explicit user approval, and must follow the sequence below one
step at a time.

## Problem Statement

The Planner currently has three user-visible problems:

1. After `Remove plan` succeeds, its card may remain visible during the current
   app session. Removing the app from Recents and reopening it correctly shows
   that the plan was removed.
2. Plan removal and its failure feedback use platform-native alerts instead of
   the app's visual language.
3. A plan can appear to remain in Planner after a user logs the planned watch.

The first issue indicates that the mutation is persisting and the stale state
is in the in-session Planner cache or refetch path. The first and third issues
make the Planner's active-intention model unclear. The second makes a
destructive Journal action look disconnected from Revit.

## Confirmed Product Behavior

Planner represents an active intention, not history.

- A plan stays visible while the user opens, edits, or cancels a logging form.
- A plan stays visible if saving the activity fails.
- Once an activity launched from Planner is saved successfully, its active plan
  is resolved and the card is removed from Planner.
- This includes `Log watch` for movies and the Planner's equivalent successful
  `Start watching` action for series or anime.
- The resulting activity appears in Timeline and, when dated, Calendar.
- `Remove plan` removes only the active plan. It must preserve the title and
  every historical activity.

This is consistent with the approved v1.1 Journal direction: plans are future
intentions, whereas watches and other activity are historical records.

## Current-State Notes

- Planner opens the Journal form with `source: 'planner'`.
- The lifecycle API marks Planner-originated activity as resolving the active
  plan.
- Shared lifecycle success handling invalidates the Planner query.
- Planner still relies on `Alert.alert` for the plan-removal confirmation and
  error feedback.

The successful state after an app restart confirms that the plan mutation is
reaching the backend. TAR-139 therefore needs an explicit in-session cache
reconciliation path in addition to the existing invalidation.

## Step 1 Findings

- Removing a plan and then reopening the app shows the plan is gone. The
  mutation is therefore persisting successfully on the backend.
- The stale result is limited to the existing Planner session after the
  successful removal; it is not a durable data-loss or RPC failure.
- The current lifecycle hook invalidates Planner data but does not directly
  reconcile the visible cached Planner item from the confirmed mutation result.
- Planner-originated logging already passes the approved Planner source and
  resolves the active plan after a successful save. Cancellation and save
  failure remain outside that success path.
- Focused verification passed: 4 test suites and 23 tests covering Planner
  actions/cards and lifecycle API/hooks. The query-key test also passed
  separately.

Conclusion: proceed to the scoped confirmation and confirmed-cache work in
Step 2. No schema, migration, or RPC redesign is indicated by Step 1.

## Proposed UX

### Plan removal

1. The user selects `Remove plan` from the card's More actions.
2. A Revit-owned destructive confirmation appears. It states that only the
   plan will be removed and Journal history will remain.
3. `Keep plan` is the safe, default action. `Remove plan` is destructive.
4. While removal is pending, duplicate actions are disabled and the card gives
   clear pending feedback.
5. After the server confirms success, the card is removed immediately from all
   cached Planner views, then the relevant Journal reads are refreshed.
6. If removal fails, the card remains and an app-owned `Could not remove plan`
   feedback surface is shown in Planner. It must not open a platform-native
   alert.

### Logging from Planner

1. Tapping `Log watch` or `Start watching` opens the focused Journal form; it
   does not change Planner yet.
2. Cancelling, discarding, validation failure, and network failure leave the
   plan in Planner unchanged.
3. A successful save resolves the plan atomically with logging the activity.
4. The Planner card is removed from cached Planner data before the form closes,
   so returning to Planner cannot show a resolved plan while a refetch catches
   up.

## Proposed Technical Approach

### 1. App-owned Journal action confirmation

Create a focused reusable confirmation surface within the Journal feature for
the Planner `Remove plan` action. It should use Revit's existing dark/gold
visual language, accessible modal semantics, and large-text-safe action
targets. Add the matching app-owned `Could not remove plan` feedback surface.

The component must support:

- a clear title and explanatory body;
- a safe cancel action and a distinct destructive confirm action;
- disabled/pending confirmation state;
- Android back and backdrop behavior that preserves the plan; and
- screen-reader focus and labels for the dialog and both actions.

Use these surfaces for the Planner `Remove plan` confirmation and its
`Could not remove plan` failure feedback. Do not expand this ticket into a
wholesale replacement of unrelated platform alerts. Follow-up adoption
elsewhere requires separate scope.

### 2. Server-confirmed Planner cache reconciliation

Keep the lifecycle RPC as the source of truth. Do not hide a plan solely because
the user entered a logging flow.

After a successful `remove plan` or Planner-originated successful activity:

- patch every cached Planner query for that user to remove the affected Journal
  title;
- retain existing targeted invalidation for Planner, Timeline, title summary,
  and Calendar data; and
- handle the empty result with the existing Planner empty state.

This is a server-confirmed cache update, not speculative pre-save deletion. A
failed mutation therefore needs no fabricated plan restoration, while the
subsequent refetch still protects against missed or concurrent changes.

### 3. Planner-local feedback

Replace the native `Could not remove plan` error alert with an app-owned error
state that explains the failed action and offers a safe retry. Preserve the
card, expanded More state where practical, and the user's ability to dismiss
the feedback without losing context. Other Planner alerts remain out of scope
unless separately approved.

### 4. Keep atomic lifecycle semantics unchanged

No schema, migration, generated database types, or new RPCs are expected.
The existing `journal_log_event` operation must continue to resolve an active
plan only for approved Planner/planned-title sources and must preserve plans
for cancelled, failed, historical, and unrelated title actions.

## Non-Goals

- Removing a title from Journal when a plan is removed.
- Deleting watch or other activity history.
- Removing a plan when a logging form merely opens.
- Changing Timeline, Calendar, List, or title-history product rules.
- Replacing alerts other than the Planner `Remove plan` confirmation and
  `Could not remove plan` feedback.
- Database schema or lifecycle-RPC redesign.

## Implementation Sequence

Do not begin a later step until the user explicitly approves proceeding to it.

1. **Reproduce and characterize** — Verify that plan removal persists while
   the current Planner session remains stale, then disappears after the app is
   reopened. Also verify successful Planner logging, cancelled logging, and
   failed logging. Record the current-session cache behavior without changing
   the backend contract.
2. **Build confirmation and feedback primitives** — Add the scoped app-owned
   destructive confirmation and Planner-local failure feedback, with focused
   accessibility coverage.
3. **Reconcile Planner cache after confirmed mutations** — Apply the
   server-confirmed Planner cache patch for plan removal and successful
   Planner-originated activity, while retaining invalidation.
4. **Verify end-to-end behavior** — Run focused tests and device checks for
   success, cancellation, failure, return navigation, and preserved history.

## Acceptance Criteria

- A confirmed successful `Remove plan` removes the card without manually
  refreshing Planner.
- Removing a plan preserves the Journal title and all history.
- `Log watch`/`Start watching` from Planner keeps the plan until the save
  succeeds, then removes it.
- Cancelling, discarding, validation failure, or network failure while logging
  leaves the plan visible and unchanged.
- The Planner `Remove plan` confirmation and `Could not remove plan` feedback
  are app-owned; those two paths contain no `Alert.alert` call.
- The confirmation clearly distinguishes `Keep plan` from `Remove plan` and
  is accessible with screen readers, large text, Android back, and pending
  state.
- Timeline, Calendar, title summary, and Planner show a coherent result after
  a successful Planner action.
- Existing history, plan-resolution, and Planner virtualization behavior
  continue to pass.

## Verification Matrix

| Area | Required checks |
| --- | --- |
| Mutation | Remove-plan RPC succeeds and retains history/title; failed RPC retains the card |
| Cache | Cached Planner entries are removed only after confirmed success and are refetched afterward |
| Logging | Successful Planner log/start resolves plan; cancelled and failed forms do not |
| UI | No native Planner action/error alert; one clear destructive confirmation is shown |
| Accessibility | Dialog focus, labels, safe Android back behavior, large-text layout, pending state |
| Regression | Timeline/Calendar updates, title summary, More actions, empty state, and virtualization |

## Implementation Tracking

| Step | Status | Notes |
| --- | --- | --- |
| 1. Reproduce and characterize | Complete | Confirmed server persistence and stale in-session Planner state; focused tests passed August 9, 2026 |
| 2. Confirmation and feedback | Complete | Added app-owned Remove plan and Could not remove plan surfaces with accessibility coverage; focused tests, typecheck, and lint passed August 9, 2026 |
| 3. Confirmed cache reconciliation | Not started | Awaiting Step 2 completion and approval |
| 4. End-to-end verification | Not started | Awaiting Step 3 completion and approval |
