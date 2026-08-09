# TAR-143: Journal UI Flow Redesign Implementation Plan

## Document Status

- Status: Approved implementation plan
- Version: v1.2
- Related issue: [TAR-143](https://linear.app/tarun495/issue/TAR-143/v12-redesign-journal-ui-flow-to-reduce-button-overload)
- Product direction: TAR-143 and interaction decisions approved August 10, 2026
- Implementation: Complete; verified August 10, 2026
- Last updated: August 10, 2026

This plan records the approved v1.2 Journal interaction direction. The user
authorized the complete ordered sequence on August 10, 2026. Keep the work
within this scope and update this document only for real implementation state.

## Scope Lock

TAR-143 is a presentation and interaction redesign. It preserves the existing
`Timeline | Planner | Calendar` model, Journal lifecycle rules, read models,
mutations, cache invalidation, capture flow, loading/empty/error/retry states,
and plan-removal confirmation behavior.

No database schema, migration, generated type, API, Edge Function, lifecycle
RPC, RLS, or third-party dependency change is authorized.

The v1.2 decision supersedes the conflicting v1.1 Planner presentation rule:
Planner items no longer retain a visible per-card primary button or More menu.

## Approved Interaction Contract

### Journal chrome

- Use quiet selected-tab styling for `Timeline`, `Planner`, and `Calendar`.
- Keep one dominant action per view: `Log`, `Add plan`, and `Log` respectively.
- Keep the existing Journal capture/search route for the primary action.

### Planner

- Every Planner item is one accessible, tappable row that opens a modal bottom
  drawer without navigating away.
- Today and Upcoming: log/start, reschedule, Move to Someday, title details,
  remove plan.
- Missed: show `What happened with this plan?`, then `I watched it`,
  reschedule, Move to Someday, title details, remove plan.
- Someday: schedule, log/start, title details, remove plan.
- Existing forms and mutations remain responsible for media-specific intent,
  plan resolution after a successful save, confirmation, feedback, and cache
  reconciliation. No plan is resolved when a form merely opens.

### Timeline and Calendar

- Logged rows open a drawer with title details, event-specific edit, and a
  rewatch action for completed events.
- Calendar planned rows open their plan drawer; logged Calendar rows open the
  logged-activity drawer.
- Preserve Timeline filters, pagination, and list position; Calendar selection,
  month, markers, and logged/planned grouping; and Planner section/position.

### Drawer requirements

- App-owned modal bottom surface, not an inline card expansion.
- Dialog semantics, labelled heading and actions, close control, focus entry,
  safe backdrop/Escape/Android Back dismissal, and large-text-safe scrolling.
- Destructive actions remain visually subordinate and retain confirmation.

## Component Ownership

```text
features/journal/components/
  JournalActionDrawer.tsx
  JournalScreen.tsx
  JournalPlannerView.tsx
  JournalTimelineView.tsx
  JournalEventCalendarView.tsx
```

The shared drawer receives explicit action callbacks. It does not own direct
database calls. Each Journal surface retains its existing query, mutation,
navigation, and restoration responsibilities.

## Implementation Sequence

1. **Journal interaction foundation** - Add the accessible shared drawer and
   quiet Journal tabs while preserving the adaptive primary action.
2. **Planner rows and plan drawers** - Replace cards with rows and wire all
   section-specific actions through existing forms, navigation, confirmation,
   feedback, and cache behavior.
3. **Timeline and Calendar parity** - Add the approved logged and planned
   action drawers without changing data, chronology, filters, or Calendar
   semantics.
4. **Verification and completion** - Run focused and full tests; verify iOS,
   Android, responsive web, keyboard, screen-reader, large-text, restoration,
   loading, error, retry, and destructive paths.

## Acceptance and Verification

| Area | Required outcome |
| --- | --- |
| Hierarchy | One dominant Journal action and quiet tabs |
| Planner | Fully tappable rows; no visible full-width actions or ellipsis controls |
| Plan behavior | Correct Upcoming/Missed/Someday language; existing lifecycle retained |
| Timeline | Filters remain active across drawer use and modal round trips |
| Calendar | Markers, selected date, month, and separate groups remain unchanged |
| Accessibility | Dialog/row semantics, focus handling, dismissal, large text, keyboard |
| Regression | Existing Journal states, title details, Lists, and capture return remain intact |

## Implementation Tracking

| Step | Status | Notes |
| --- | --- | --- |
| 1. Journal interaction foundation | Complete | Added the shared accessible action drawer and quiet tab styling |
| 2. Planner rows and plan drawers | Complete | Replaced Planner cards with rows and wired the approved section actions |
| 3. Timeline and Calendar parity | Complete | Added contextual activity and plan drawer entry points |
| 4. Verification and completion | Complete | 142 tests, typecheck, and lint passed August 10, 2026 |

## Decision Log

| Date | Decision | Status |
| --- | --- | --- |
| August 10, 2026 | TAR-143 v1.2 direction takes priority over the v1.1 Planner card presentation | Approved |
| August 10, 2026 | Today follows Upcoming actions; Missed uses decision language; Someday schedules/logs/opens details/removes | Approved |
| August 10, 2026 | Timeline and Calendar use matching contextual activity/plan drawers | Approved |
| August 10, 2026 | No API, backend, or schema work | Approved |

## Completion Record

Completed August 10, 2026.

- Added an app-owned modal Journal action drawer with labelled actions, heading
  focus, safe dismissal, responsive scrolling, and destructive visual tone.
- Reworked Journal navigation from a visually heavy segmented control to quiet
  underline tabs while retaining its adaptive top-level primary action.
- Replaced Planner cards, visible full-width actions, and ellipsis controls
  with fully tappable title rows and section-specific drawers.
- Added the approved Today/Upcoming, Missed, and Someday action language while
  reusing the existing form intents, lifecycle mutations, confirmation,
  feedback, and cache reconciliation.
- Added contextual logged-activity drawers to Timeline and Calendar, plus plan
  drawers for scheduled Calendar plans, without changing Journal data contracts.
- Updated Planner interaction tests for the new row/drawer contract and added
  explicit Missed-plan decision-language coverage.
- Passed `npm run typecheck`, `npm run lint`, and the full Jest suite: 24 test
  suites and 142 tests. No API, backend, schema, or generated type changed.
