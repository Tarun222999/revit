# TAR-143: Journal UI Flow Redesign Implementation Plan

## Document Status

- Status: Approved implementation proposal
- Version: v1.2
- Related issue: [TAR-143](https://linear.app/tarun495/issue/TAR-143/v12-redesign-journal-ui-flow-to-reduce-button-overload)
- Product direction: The TAR-143 ticket and the approved interaction decisions
  recorded on August 10, 2026
- Implementation: Not started; Step 1 requires separate explicit approval
- Last updated: August 10, 2026

This document turns the approved v1.2 interaction direction into a bounded,
ordered implementation plan. It does not authorize code, schema, migration, or
tracker changes. Each implementation step requires explicit approval and must
be completed before work begins on the next step.

## Objective

Make Journal calm and easy to scan by replacing repeated visible card actions
with a quiet visual hierarchy, tappable content rows, and contextual action
drawers. Preserve the existing `Timeline | Planner | Calendar` model and all
existing Journal lifecycle behavior.

## Decision Precedence

For this ticket, the approved v1.2 interaction direction supersedes the v1.1
Planner presentation rule that kept the log/start action visibly attached to
every card. TAR-143 changes presentation and interaction hierarchy only; the
existing plan, event, title-state, and mutation contracts remain authoritative.

## Confirmed Interaction Contract

### Journal-level navigation

- Keep the three Journal views: `Timeline`, `Planner`, and `Calendar`.
- Use quiet tab styling: selected state is clear, but the tab container is not
  visually equivalent to three large buttons.
- Preserve one dominant Journal-level action:
  - Timeline: `Log`
  - Planner: `Add plan`
  - Calendar: `Log`
- The existing Journal capture/search route remains the primary-action flow. It
  is not replaced with a new search implementation inside the action drawer.

### Planner rows and drawers

Each Planner item becomes one clearly tappable, accessible row. It has no
always-visible full-width action button and no separate ellipsis trigger. A row
opens an app-owned contextual bottom drawer without navigating away from the
Planner list.

Drawer actions are deliberately context-specific:

| Plan section | Drawer prompt and actions |
| --- | --- |
| Today / Upcoming | `Log watch` or `Start watching`; `Reschedule`; `Move to Someday`; `View title details`; `Remove plan` |
| Missed | Show `What happened with this plan?`; `I watched it`; `Reschedule`; `Move to Someday`; `View title details`; `Remove plan` |
| Someday | `Schedule`; `Log watch` or `Start watching`; `View title details`; `Remove plan` |

`I watched it` and `Log watch`/`Start watching` reuse the existing
intent-aware Journal form and the existing Planner-originated lifecycle path.
They do not create a new mutation, infer a date, or resolve a plan before a
successful save. The existing form determines the specific media-appropriate
intent.

`Remove plan` retains its existing app-owned confirmation, pending behavior,
error feedback, server-confirmed cache reconciliation, and guarantee that
history remains intact.

### Timeline and Calendar parity

- A logged Timeline row opens a contextual drawer with `View title details`,
  event-specific `Edit activity`, and `Log a rewatch` when supported by the
  current title state.
- A logged Calendar item uses the same logged-activity drawer.
- A planned Calendar item uses the matching Planner plan drawer.
- The existing Calendar grid, logged/planned markers, selected-day grouping,
  month navigation, and factual month summary remain intact.

### Drawer behavior

- The drawer is a modal bottom surface, not an inline expanding card.
- It has an accessible title, labelled actions, focus entry, safe dismissal,
  and Android Back/Escape/backdrop behavior.
- Dismissal returns focus to the row that opened it when that row remains
  mounted.
- Destructive actions are visually subordinate. They still require the existing
  confirmation wherever it is currently required.
- Opening, cancelling, failing, or completing an action must not reset the
  active Journal view, Planner section, Timeline filters, Calendar month/date,
  or the owning list's scroll position.

## Current-State Boundaries

The data layer already provides the required capabilities:

- Planner reads classify active plans into Today, Upcoming, Missed, and Someday.
- Existing form intents and lifecycle mutations handle plan logging, starting,
  rescheduling, scheduling, moving to Someday, and removing a plan.
- Timeline and Calendar read existing event/plan models separately.
- Existing modal confirmation and feedback components handle plan removal.
- Existing cache invalidation and the TAR-139 confirmed Planner reconciliation
  keep a successfully resolved or removed plan from remaining visible.

No database schema, migration, generated type, API, Edge Function, lifecycle
RPC, or third-party dependency change is in scope.

## Proposed Component Boundaries

Keep routes thin and retain Journal ownership of interaction state. The exact
file split may be smaller if it remains clear, but the responsibilities must
stay distinct.

```text
features/journal/components/
  JournalActionDrawer.tsx          # accessible modal drawer and focus/dismissal
  JournalPlannerView.tsx           # tappable plan rows and plan action model
  JournalTimelineView.tsx          # logged-row drawer entry point
  JournalEventCalendarView.tsx     # logged/planned drawer entry points
  JournalScreen.tsx                # quiet view tabs and Journal-level hierarchy
features/journal/model/
  journalPlanner.ts                # extend/reuse deterministic plan action labels
  journalTimeline.ts               # extend/reuse logged-activity action model
```

The drawer must receive an explicit action model rather than duplicate lifecycle
or routing rules in every visual row. It may call existing callbacks supplied by
each owning screen, but it must not make direct database calls.

## State and Restoration Strategy

- Keep the relevant `SectionList`, `FlatList`, and Calendar surface mounted
  beneath the drawer whenever possible.
- Store the row that opened the drawer for focus restoration only; do not use a
  global selected-title state that can leak across Journal views.
- Opening a focused Journal form continues to use the existing modal route and
  `source` contract. The underlying Journal view must remain intact beneath it.
- A successful mutation uses existing targeted invalidation and reconciliation;
  it must not replace the Journal route or reset view-local state.
- If a successful mutation removes the currently selected plan, close the
  drawer, preserve the nearest remaining list position, and announce the
  result through existing feedback conventions.

## Accessibility and Responsive Requirements

- Rows have button semantics, a clear accessible name that includes title and
  plan/event context, and a comfortable touch target.
- The drawer uses dialog semantics, a labelled heading, a close control, and
  announced state changes.
- Keyboard users can open rows, operate actions, and dismiss the drawer on web.
- Screen-reader and Android Back dismissal preserve the underlying data and
  return focus safely.
- Large text cannot clip action labels, hide destructive context, or make the
  drawer impossible to scroll.
- Verify the resulting presentation on iOS, Android, and responsive web.

## Non-Goals

- Any schema, API, backend, RLS, or query-contract change
- A new Journal product feature, recommendation system, reminder, or plan type
- Changes to Discover, Lists, Profile, authentication, or title-history scope
- Replacing every modal, menu, or alert in the application
- Changing the meaning of plan resolution, event history, or Calendar markers
- Rewriting Journal capture/search or adding a new bottom-sheet dependency

## Implementation Sequence

Do not begin a later step until the user explicitly approves proceeding to it.

1. **Build the Journal interaction foundation** — Add the accessible,
   app-owned action drawer and quiet Journal tabs while preserving the existing
   primary actions and all current read/mutation behavior. Add focused drawer
   dismissal, focus, and responsive-layout coverage. Stop for review.
2. **Redesign Planner rows and wire plan drawers** — Replace Planner cards with
   tappable rows, implement the approved Today/Upcoming/Missed/Someday action
   models, and route actions through existing forms, navigation, confirmation,
   feedback, and cache behavior. Verify section and scroll restoration. Stop
   for review.
3. **Apply Timeline and Calendar interaction parity** — Make logged and planned
   items open the approved contextual drawers without changing their data,
   chronology, filters, grid markers, or selected-date behavior. Stop for
   review.
4. **Verify and record completion** — Run focused and full test coverage,
   complete iOS/Android/web accessibility and restoration checks, resolve
   in-scope regressions, and update this document with completion records.
   Stop for final approval.

## Acceptance Mapping

| Ticket requirement | Implementation step |
| --- | --- |
| One dominant action per Journal view | Step 1 |
| Quiet Journal navigation styling | Step 1 |
| Tappable Planner rows without visible action/ellipsis controls | Step 2 |
| Contextual upcoming, missed, and Someday plan actions | Step 2 |
| Plan confirmation, feedback, and lifecycle preservation | Step 2 |
| Timeline and Calendar visual/interaction consistency | Step 3 |
| No reset of Journal context after actions | Steps 2–3 |
| Cross-platform, accessibility, loading/error, and regression coverage | Step 4 |
| No API, database, or backend changes | All steps |

## Verification Matrix

| Area | Required checks |
| --- | --- |
| Journal chrome | Adaptive primary label, quiet selected tabs, signed-out boundary |
| Drawer | Dialog semantics, focus entry/return, backdrop/Escape/Android Back, large text, responsive web |
| Planner | One tappable row, section-specific copy, every action route, pending/error/confirmation states |
| Missed plan | Decision prompt, `I watched it` intent, successful plan resolution only after save |
| Someday | Schedule, log/start, details, and remove behavior with no redundant move action |
| Timeline | Event drawer actions preserve filters, pagination, and list position |
| Calendar | Logged/planned drawers preserve selected day, month, markers, and groups |
| Data | Existing mutations, cache invalidation, TAR-139 reconciliation, history protection |
| Regression | Loading, empty, error, retry, title details, Lists, and Journal capture return |
| Manual | iOS, Android, and responsive web; keyboard and screen-reader paths |

## Implementation Tracking

| Step | Status | Approval / verification note |
| --- | --- | --- |
| 1. Journal interaction foundation | Not started | Requires explicit approval |
| 2. Planner rows and plan drawers | Not started | Blocked by Step 1 completion and approval |
| 3. Timeline and Calendar parity | Not started | Blocked by Step 2 completion and approval |
| 4. Verification and completion | Not started | Blocked by Step 3 completion and approval |

## Decision Log

| Date | Decision | Status |
| --- | --- | --- |
| August 10, 2026 | v1.2 TAR-143 interaction direction takes precedence over the conflicting v1.1 Planner card presentation | Approved |
| August 10, 2026 | Today follows Upcoming plan actions; Missed plans use decision language; Someday offers schedule, log/start, details, and removal | Approved |
| August 10, 2026 | Timeline logged rows use a contextual activity drawer; Calendar logged/planned items use their matching activity/plan drawers | Approved |
| August 10, 2026 | Reuse existing Journal data and lifecycle contracts; no API, backend, or schema work | Approved |
