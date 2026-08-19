# TAR-143: Journal UI Flow Redesign Implementation Plan

## Document Status

- Status: Approved implementation plan
- Version: v1.2.1
- Related issue: [TAR-143](https://linear.app/tarun495/issue/TAR-143/v12-redesign-journal-ui-flow-to-reduce-button-overload)
- Product direction: TAR-143 and interaction decisions approved August 10, 2026
- Implementation: Complete; verified August 10, 2026
- Last updated: August 12, 2026

## Scope Lock

TAR-143 is a presentation and interaction redesign. It preserves the existing
`Timeline | Planner | Calendar` model, Journal lifecycle rules, read models,
mutations, cache invalidation, capture flow, loading/empty/error/retry states,
and plan-removal confirmation behavior.

No database schema, migration, generated type, API, Edge Function, lifecycle
RPC, RLS, or third-party dependency change is authorized.

The approved v1.2 decision supersedes the conflicting v1.1 Planner card
presentation: Planner items have neither a visible per-card primary action nor
a separate ellipsis control.

## Confirmed Interaction Contract

### Journal chrome

- Keep `Timeline`, `Planner`, and `Calendar` with quiet selected-tab styling.
- Keep one dominant Journal-level action: `Log`, `Add plan`, and `Log`.
- Reuse the existing Journal capture/search route for that primary action.

### Planner

- Each plan is one accessible, fully tappable row that opens an app-owned modal
  bottom drawer without leaving the Planner.
- Today and Upcoming actions: log/start, reschedule, Move to Someday, title
  details, and remove plan.
- Missed actions: show `What happened with this plan?`, then `I watched it`,
  reschedule, Move to Someday, title details, and remove plan.
- Someday actions: schedule, log/start, title details, and remove plan.
- Existing focused forms retain responsibility for media-specific intent. The
  plan resolves only after a successful Planner-originated save.

### Timeline and Calendar

- Logged rows use an activity drawer for title details, event-specific editing,
  and rewatching when the selected event is complete.
- Scheduled Calendar plans use the corresponding plan drawer.
- Preserve Timeline filters, pagination, list position, Calendar month and
  selection, markers, separate Logged/Planned groups, and Planner position.

### Drawer requirements

- Modal bottom surface, not an inline expansion.
- Labelled dialog heading and actions, close control, focus entry, backdrop,
  Escape, and Android Back dismissal, with large-text-safe scrolling.
- Destructive actions remain subordinate and retain existing confirmation.

## Component Ownership

```text
features/journal/components/
  JournalActionDrawer.tsx
  JournalScreen.tsx
  JournalPlannerView.tsx
  JournalTimelineView.tsx
  JournalEventCalendarView.tsx
```

The shared drawer receives explicit action callbacks and makes no direct
database calls. Each Journal surface retains its query, mutation, navigation,
and restoration responsibilities.

## Implementation Sequence

1. Add the shared drawer and quiet Journal tabs.
2. Replace Planner cards with contextual plan drawers.
3. Add Timeline and Calendar interaction parity.
4. Verify accessibility, restoration, and regression behavior.

## Acceptance and Verification

| Area | Required outcome |
| --- | --- |
| Hierarchy | One dominant Journal action and quiet tabs |
| Planner | Tappable rows; no visible full-width actions or ellipsis controls |
| Plan behavior | Correct Upcoming/Missed/Someday language; lifecycle retained |
| Timeline | Filters remain active across drawer use and modal round trips |
| Calendar | Markers, selected date, month, and groups remain unchanged |
| Accessibility | Dialog/row semantics, focus, dismissal, large text, keyboard |
| Regression | Existing Journal states, title details, Lists, and capture return work |

## Implementation Tracking

| Step | Status | Notes |
| --- | --- | --- |
| 1. Journal interaction foundation | Complete | Shared accessible drawer and quiet tab styling |
| 2. Planner rows and plan drawers | Complete | Tappable rows and section-specific action drawers |
| 3. Timeline and Calendar parity | Complete | Contextual activity and plan drawer entry points |
| 4. Verification and completion | Complete | 24 suites / 142 tests, typecheck, and lint passed |

## Completion Record

Completed August 10, 2026.

- Added `JournalActionDrawer` with labelled actions, heading focus, safe
  dismissal, responsive scrolling, and destructive visual tone.
- Reworked Journal navigation to quiet underline tabs while retaining adaptive
  primary actions.
- Replaced Planner cards, visible full-width actions, and ellipsis controls
  with fully tappable title rows and contextual drawers.
- Reused existing form intents, lifecycle mutations, confirmation, feedback,
  invalidation, and Planner cache reconciliation.
- Added contextual logged-activity drawers to Timeline and Calendar and plan
  drawers for scheduled Calendar plans without changing data contracts.
- Added Missed-plan decision-language coverage and updated Planner interaction
  tests for the row/drawer model.
- Passed `npm run typecheck`, `npm run lint`, and the full Jest suite: 24 test
  suites and 142 tests. No API, backend, schema, or generated type changed.

## Decision Log

| Date | Decision | Status |
| --- | --- | --- |
| August 10, 2026 | TAR-143 v1.2 direction supersedes the v1.1 Planner presentation | Approved |
| August 10, 2026 | Today follows Upcoming actions; Missed uses decision language; Someday schedules/logs/opens details/removes | Approved |
| August 10, 2026 | Timeline and Calendar use matching contextual activity/plan drawers | Approved |
| August 10, 2026 | No API, backend, or schema work | Approved |
