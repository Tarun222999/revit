# Revit v1.1 Journal Refinement Implementation Plan

## Document Status

- Status: Approved
- Product direction: Approved in `docs/v1.1/journal-refinement.md`
- Implementation: Approved to proceed one step at a time
- Parent Linear issue: [TAR-119](https://linear.app/tarun495/issue/TAR-119/v11-update-user-journal-journey)
- Linear sub-issues: Not used for this phase
- Last updated: July 29, 2026

This document authorizes the ordered implementation phase. It does not authorize
skipping steps: each implementation step still requires explicit user approval
before work on that step begins.

## Purpose

This document turns the approved v1.1 Journal product direction into an ordered,
trackable implementation plan.

It defines:

- the proposed database and application boundaries
- the migration and data-safety expectations
- the required query and mutation behavior
- the order in which implementation should proceed
- the named implementation workstreams under TAR-119
- the verification required before each step is considered complete
- the mapping from TAR-119 acceptance examples to implementation work

The approved product behavior remains defined by
`docs/v1.1/journal-refinement.md`. If this document conflicts with that product
document, the approved product document wins unless the user explicitly changes
the decision.

## Approval And Tracking Rules

This is a phase document with an `Implementation Sequence`. Follow the repository
phase rule strictly:

1. Complete or discuss only the current step.
2. Record its outcome and verification in this document.
3. Stop and wait for explicit user approval.
4. Begin the next step only after that approval.

Approval of this document authorizes the ordered implementation phase, not all
steps at once. Material schema or UX changes discovered during implementation
must be added to the Decision Log and reviewed before continuing.

The user chose not to create Linear sub-issues for this phase. Track progress in
this document instead.

## Phase Goal

Deliver the approved v1.1 Journal journey:

- Journal navigation is `Timeline | Planner | Calendar`.
- Plans are intentions and never become historical activity by being created or
  edited.
- One user/title relationship supports many dated events and unlimited rewatches.
- Rating and Notes belong to a specific completed watch.
- Title Details shows a compact `Your Journal` summary and a complete on-demand
  History surface.
- User-selected date-only values drive Timeline, Planner, and Calendar.
- Plan, event, and title removal actions have separate consequences.
- Queries, mutations, retries, and navigation preserve a consistent user state.

## Non-Goals

This phase does not add:

- public reviews, sharing, spoiler moderation, or community features
- episode or season progress
- reminders or notifications for plans
- more than one active plan per title
- automatic scrobbling or provider-driven watch history
- games or IGDB integration
- changes to Lists beyond protecting its independence from Planner
- a new global state library or ORM

## Current Implementation Baseline

The v1 implementation currently has:

- one `journal_entries` row per user and media item
- title-level status, rating, review headline, review body, spoiler flag, and dates
- a generic Add/Edit Journal Entry modal
- title-specific create, update, and delete helpers
- a Timeline derived from mutable title rows and system activity timestamps
- a Calendar derived from the current entry model
- `Your Entry` and generic edit behavior on Title Details
- TanStack Query invalidation rooted in the Journal feature

The v1.1 implementation must evolve this baseline without resetting user data and
without modifying the approved v1 documents to describe v1.1 behavior.

## Proposed Technical Contract

This contract is a draft until Implementation Step 1 is approved.

### 1. Title State Remains One Row Per User And Title

Keep `journal_entries` as the title-level relationship.

Responsibilities:

- user and media-item ownership
- current relationship status
- whether an active plan exists
- optional planned date
- management timestamps

The unique `(user_id, media_item_id)` constraint remains. It prevents duplicate
title-state rows while allowing unlimited child events.

Recommended plan representation on `journal_entries`:

- `has_active_plan boolean not null default false`
- `planned_for date null`

This explicit boolean is required because a Someday plan has no date. A nullable
`planned_for` value alone cannot distinguish Someday from no plan.

Recommended constraint:

- `planned_for` must be null when `has_active_plan` is false

Current status and active plan are independent where history exists. For example,
a completed title with a future rewatch plan remains completed while
`has_active_plan` is true.

### 2. Dated History Uses A Separate Event Table

Add a user-owned `journal_events` table with a many-to-one relationship to
`journal_entries`.

Proposed fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable event identifier |
| `journal_entry_id` | Parent title-state row |
| `user_id` | Explicit ownership for RLS and user-scoped queries |
| `event_type` | `started`, `completed`, or `stopped` |
| `event_date` | User-selected date-only activity date |
| `rating` | Optional `0.5` to `5.0` half-step value for completion events |
| `notes` | Optional private personal text for that event |
| `created_at` | System creation metadata and stable tie-breaker |
| `updated_at` | System edit metadata |

Rules:

- Every first watch and rewatch is a separate `completed` event.
- Rewatch is inferred when an earlier completed event exists; it is not a stored
  event type.
- Multiple events for the same title on the same date are allowed.
- Rating is null for `started` and `stopped` events.
- Rating uses the existing half-step constraint.
- Notes remain private and do not have a spoiler field.
- System timestamps never substitute for `event_date`.
- Deleting an event does not automatically delete its parent title or other
  events.

### 3. Title-Level Review Fields Are Retired After Migration

The following v1 fields should no longer be written by v1.1 flows:

- `rating`
- `review_headline`
- `review_body`
- `contains_spoilers`
- overloaded `started_on`
- title-level `completed_on`

Data must be copied safely to its v1.1 destination before obsolete fields are
removed. Column removal should happen only after backfill verification and app
compatibility are confirmed. A staged migration is preferred over dropping
source columns in the first migration.

### 4. Date Semantics Are Explicit

| Value | Meaning | Storage |
| --- | --- | --- |
| `planned_for` | Intended future or current local date | `date`, nullable |
| `event_date` | Date an activity actually happened | `date`, required |
| `created_at` | Database insertion time | `timestamptz` |
| `updated_at` | Database update time | `timestamptz` |

Application rules:

- New event dates default to the device's current local date.
- Event dates may be today or earlier, not in the future.
- New planned dates may be today or later.
- A Someday plan has `has_active_plan = true` and `planned_for = null`.
- Display and grouping never convert a date-only value through UTC.
- Editing rating or Notes does not alter `event_date`.

### 5. Ownership And RLS

Every exposed user-data table must have RLS enabled.

`journal_events` policies must:

- scope select, insert, update, and delete to `auth.uid()` ownership
- use both `USING` and `WITH CHECK` for update
- ensure an event cannot reference another user's `journal_entries` row
- include a select policy because RLS-protected updates require it

If database functions are introduced for atomic transitions, prefer security
invoker behavior. A security-definer function requires a separate security
review, an explicit `auth.uid()` ownership check, restricted execute grants, and
a non-exposed schema where practical.

Before implementation, verify current Supabase documentation and changelog for
relevant CLI, RLS, Data API, and function behavior.

### 6. Required Indexes

The schema step should verify indexes for:

- Timeline: `(user_id, event_date desc, created_at desc)`
- Title History: `(journal_entry_id, event_date desc, created_at desc)`
- Planner: active plan state and `planned_for`
- Calendar: user and event date range
- Title identity: unique `(user_id, media_item_id)`

Indexes should be justified by the actual query shapes and checked with the
database advisors before the migration is finalized.

### 7. Atomic State Transitions

Operations that change both title state and event history must succeed or fail
together. The implementation should use transaction-safe Postgres operations
rather than separate client writes.

Atomic operations are required for:

- starting or resuming a title and adding a `started` event
- finishing or watching a title and adding a `completed` event
- stopping a title and adding a `stopped` event
- resolving a plan while logging from Planner or a planned-title action
- deleting a status-defining event and recomputing current state
- removing a title and its plan/history

The schema step must finalize whether these operations use narrowly scoped
database functions or another transaction-safe database design. The client must
not simulate atomicity with a sequence of unrelated requests.

## State And Plan Rules

| User action | Event created | Current state result | Active plan result |
| --- | --- | --- | --- |
| Add plan | None | `planned` when no later state exists | Created or replaced |
| Reschedule | None | Unchanged | Date updated |
| Move to Someday | None | Unchanged | Kept with no date |
| Start or resume | `started` | `in_progress` | Resolved when launched from the active plan |
| Log watch or mark watched | `completed` | `completed` | Resolved when launched from Planner or the planned-title action |
| Add previous watch from History | `completed` | Recomputed only if the event is the latest status-defining event | Future plan preserved |
| Stop watching | `stopped` | `dropped` | No unrelated plan change |
| Edit historical event | None | Recomputed only when status-defining order changes | Preserved |
| Delete one event | None | Recomputed from remaining events and plan | Preserved |
| Remove plan | None | Recomputed if the plan was the only state | Removed; history preserved |
| Remove from Journal | N/A | Title-state row removed | Plan and all history removed after confirmation |

State recomputation must be deterministic and feature-owned. The same rules
must not be reimplemented differently in several UI components.

## Query And Cache Contract

The Journal feature should expose purpose-specific typed queries rather than one
unbounded query used by every screen.

Required read shapes:

1. Title Journal summary
   - current state
   - active plan
   - latest completed event
   - latest completed rating and Notes
   - completed watch count
2. Title History
   - reverse-chronological event pages
3. Timeline
   - reverse-chronological event pages with media metadata
4. Planner
   - Today, Upcoming, Missed, and Someday title rows
5. Calendar month
   - events and scheduled plans for the visible grid range

Cache behavior:

- successful mutations refresh Title Details, Timeline, Planner, and affected
  Calendar ranges
- background refresh preserves already loaded content
- a failed query must not be treated as an empty state
- actions that could create duplicate title rows remain disabled when title
  state is unknown
- full History is fetched only when requested
- Timeline uses bounded or paginated loading
- Calendar loads the visible month and adjacent grid dates, not all history

## UX Implementation Contract

### Journal Modal Intents

The route remains a modal, but its launch intent defines its fields and copy.

Supported intents:

- add plan
- edit plan
- log watch or finish
- log rewatch
- add previous watch
- start or resume
- stop
- edit a selected event

The logging form contains:

- event date
- optional rating for a completed event
- optional Notes

The v1 headline and spoiler controls are removed. Provider release metadata may
show a warning but may not block an explicit historical or current watch.

Every intent must preserve entered values after validation or network failure,
disable repeated submission while pending, and warn before dismissing changed
input.

### Title Details

Replace `Your Entry` with `Your Journal` and show the compact summary before
loading full History.

Use target-specific actions:

- Edit plan
- Edit latest watch
- Update status
- View history
- Remove plan
- Remove from Journal

History rows edit or delete only their selected event. Destructive confirmations
must explain whether one event, one plan, or the complete title history is being
removed.

### Timeline

- display dated events, never plan creation or edits
- remain reverse chronological
- allow event/date/media/rating filters
- do not support title or rating sorting
- show the event label more prominently than current title status
- keep separate events for repeated watches

### Planner

- show Today, Upcoming, Missed, and Someday
- keep one active plan per title
- support log/start, reschedule, move to Someday, and remove-plan actions
- keep completed state visible when a rewatch is planned
- never mutate Lists

### Calendar

- show scheduled plans and dated events as different concepts
- distinguish markers by icon or shape in addition to color
- show separate Logged and Planned groups for a selected day
- omit unscheduled plans
- restore the selected month and date after returning from Title Details
- replace v1 summary tiles with one factual month summary

### Fast Capture And Navigation

- Timeline and Calendar expose `Log`
- Planner exposes `Add plan`
- both reuse Search in an intent-aware mode
- signed-out users see a sign-in path before a form opens
- returning restores the Journal view and practical filter, scroll, and Calendar
  selection state

## Data Migration Contract

Existing journal data must be preserved. No production migration should run
until the mapping is verified against representative local data.

Draft mapping:

| Existing v1 row | v1.1 result |
| --- | --- |
| `planned` | Keep title row and create an active plan; map its user-selected plan date to `planned_for` |
| `completed` with reliable `completed_on` | Create one `completed` event with that date, rating, and review body as Notes |
| `completed` without reliable date | Preserve current state without inventing an event date; flag for verification |
| `in_progress` with a reliable start date | Create a `started` event and preserve current state |
| `dropped` with a user-selected stop date | Create a `stopped` event only after confirming the v1 form semantics |
| Missing or ambiguous activity date | Preserve title state; never substitute `created_at` or `updated_at` as user activity |
| `review_headline` | Do not merge silently into Notes; retire after verified handling |
| `contains_spoilers` | Retire after Notes migration; no v1.1 equivalent |

Migration requirements:

- create a backup or verified rollback path before applying production changes
- use a generated, descriptive SQL migration filename from the Supabase CLI
- make backfill rerun-safe or explicitly guard against duplicate event creation
- compare source and destination counts
- verify representative planned, in-progress, completed, dropped, rated, unrated,
  and undated rows
- test RLS with two distinct authenticated users
- regenerate TypeScript database types after the final schema is applied
- run database advisors and review every relevant warning
- remove obsolete columns only in a later verified cleanup migration

## Implementation Workstreams

No Linear sub-issues will be created. These approved titles remain as the named
implementation workstreams for tracking scope and dependencies.

| Step | Proposed issue title | Depends on |
| --- | --- | --- |
| 1 | Define the v1.1 Journal implementation contract | TAR-119 product approval |
| 2 | Add Journal event schema and migrate existing entries | Step 1 |
| 3 | Build the Journal event and title-state data layer | Step 2 |
| 4 | Implement atomic Journal lifecycle transitions | Step 3 |
| 5 | Rework the Journal modal into intent-based flows | Step 4 |
| 6 | Replace Title Details entry controls with Your Journal and History | Step 5 |
| 7 | Rebuild Timeline from dated Journal events | Step 6 |
| 8 | Add Planner view and complete plan management | Step 7 |
| 9 | Rebuild Calendar around events and scheduled plans | Step 8 |
| 10 | Add Journal fast capture and navigation restoration | Step 9 |
| 11 | Complete Journal integration testing and UX hardening | Step 10 |

## Implementation Sequence

### Step 1. Define And Approve The Implementation Contract

Workstream title:

`Define the v1.1 Journal implementation contract`

Scope:

- review this document against the approved product direction
- finalize the title-state, active-plan, and event schema
- confirm staged migration and rollback rules
- confirm transaction-safe lifecycle operations
- confirm query boundaries and cache invalidation
- approve the proposed workstream breakdown

Expected outcome:

- this document is marked Approved
- unresolved schema decisions are closed or explicitly deferred
- no implementation ambiguity remains for Step 2
- approved workstreams are ready to track in this document

Verification:

- every TAR-119 acceptance example maps to at least one step
- product terminology matches `journal-refinement.md`
- no v1.1 behavior is added to historical v1 documents

Stop after Step 1 and wait for explicit approval before Step 2.

### Step 2. Add Schema, RLS, And Safe Data Migration

Workstream title:

`Add Journal event schema and migrate existing entries`

Scope:

- create the approved Journal schema migration
- add `journal_events` constraints, ownership policies, and indexes
- add the approved active-plan representation
- backfill existing rows without invented dates
- retain source columns until verification passes
- regenerate database types

Expected outcome:

- current users retain their Journal data
- multiple dated events can belong to one title
- Someday and dated plans are distinguishable from no plan
- unauthorized cross-user reads and writes fail

Verification:

- migration works on a representative local database
- source/destination counts and samples are documented
- two-user RLS checks pass
- database advisors are reviewed
- generated types match the schema

Stop after Step 2 and wait for explicit approval before Step 3.

### Step 3. Build The Journal Data Layer

Workstream title:

`Build the Journal event and title-state data layer`

Scope:

- add feature-owned title-state, plan, event, summary, and history types
- map Supabase rows into narrow UI view models
- implement title summary, history, Timeline, Planner, and Calendar queries
- define query keys and targeted invalidation
- keep screens independent from raw joined database rows

Expected outcome:

- each Journal surface can request only the data it needs
- Timeline and History support bounded loading
- Calendar queries by visible date range
- loading failure remains distinct from no Journal state

Verification:

- mapping and date helpers have focused tests
- query errors do not expose duplicate-creating actions
- no client query uses system timestamps as user activity dates

Stop after Step 3 and wait for explicit approval before Step 4.

### Step 4. Implement Atomic Lifecycle Transitions

Workstream title:

`Implement atomic Journal lifecycle transitions`

Scope:

- implement plan creation, edit, Someday, reschedule, and removal
- implement start, resume, complete, stop, rewatch, and previous-watch operations
- apply the approved plan-resolution rules
- implement event edit/delete and deterministic state recomputation
- implement complete title removal
- prevent duplicate submissions and partial state/event writes

Expected outcome:

- lifecycle actions either complete fully or leave data unchanged
- rewatches create new events without duplicate title rows
- deleting one event preserves unrelated history and plans
- logging from Planner resolves the correct active plan
- adding previous history preserves a future plan

Verification:

- transition matrix tests cover every action and source context
- failure-path tests prove partial writes do not persist
- concurrent or repeated requests cannot create duplicate title rows

Stop after Step 4 and wait for explicit approval before Step 5.

### Step 5. Rework The Intent-Based Journal Modal

Workstream title:

`Rework the Journal modal into intent-based flows`

Scope:

- route each launch action to the correct focused form
- implement plan, log, rewatch, previous-watch, start, finish, stop, and edit modes
- remove headline and spoiler controls
- use per-event rating and Notes
- implement local date validation and provider release warnings
- preserve input after failure and protect dirty dismissal
- provide intent-specific loading, error, and success feedback

Expected outcome:

- users never need to interpret a generic status-first form
- a failed save is safely retryable without re-entering values
- editing rating or Notes does not move an event date
- external release metadata never blocks a real watch

Verification:

- validation tests cover plan and event date boundaries
- manual checks cover close, back, and gesture dismissal
- repeated Save taps result in one mutation
- rating works by touch and accessible increment/decrement controls

Stop after Step 5 and wait for explicit approval before Step 6.

### Step 6. Build Your Journal And History On Title Details

Workstream title:

`Replace Title Details entry controls with Your Journal and History`

Scope:

- replace `Your Entry` with a compact `Your Journal` summary
- show current state, active plan, latest completed watch, latest rating/Notes,
  and watch count
- implement precise primary, secondary, and More-menu actions
- add on-demand full History
- edit or delete one selected event
- add distinct plan and title removal confirmations
- disable unsafe actions while Journal state is unknown

Expected outcome:

- Title Details shows Journal information without loading all history by default
- generic `Edit Entry` is removed
- every edit and delete action names its target and consequence
- removing a plan preserves history

Verification:

- action matrix is checked for movie, series, anime, and all supported states
- latest-watch fallback works after edit or delete
- destructive confirmation includes watch/activity count and plan state
- signed-out and query-error states are safe and actionable

Stop after Step 6 and wait for explicit approval before Step 7.

### Step 7. Rebuild Timeline From Events

Workstream title:

`Rebuild Timeline from dated Journal events`

Scope:

- render event-based cards in reverse chronological order
- infer rewatch labels from earlier completion history
- group by the user-selected event date
- add compact search and event/media/rating/date filters
- remove title/rating sorting and title-state activity assumptions
- add pagination and stable loading/error/empty states

Expected outcome:

- plans never appear as Timeline activity
- repeated watches appear as separate dated cards
- event Notes and ratings remain attached to their event
- Timeline remains chronological under every filter combination

Verification:

- same-title rewatches render independently
- rating/note edits do not change event position unless the date changed
- pagination preserves stable ordering for same-date events
- filtered-empty state identifies and clears active filters

Stop after Step 7 and wait for explicit approval before Step 8.

### Step 8. Add Planner And Plan Management

Workstream title:

`Add Planner view and complete plan management`

Scope:

- add Planner to the Journal segmented control
- build Today, Upcoming, Missed, and Someday sections
- implement log/start, reschedule, move-to-Someday, and remove-plan actions
- show completed state alongside a future rewatch plan
- keep Planner mutations independent from Lists

Expected outcome:

- every active plan appears in exactly one Planner section
- one title cannot have multiple active plans
- plans never create false Timeline activity
- Lists are unchanged by Planner actions

Verification:

- local-day boundaries correctly move plans among sections
- missed-plan actions follow the approved plan-resolution rules
- removing the only plan cleans up an otherwise empty title row
- completing a planned watch resolves that plan

Stop after Step 8 and wait for explicit approval before Step 9.

### Step 9. Rebuild Calendar Around Events And Plans

Workstream title:

`Rebuild Calendar around events and scheduled plans`

Scope:

- query and render logged events and scheduled plans by date range
- use distinct accessible markers for both categories
- add separate Logged and Planned selected-day groups
- support future month navigation when plans exist
- remove v1 summary tiles and add one factual month summary
- preserve Calendar month/day selection through Title Details navigation

Expected outcome:

- Calendar reflects the user's chosen dates
- an unscheduled plan never appears in Calendar
- a date containing both a plan and activity shows both
- Calendar meaning remains understandable without color

Verification:

- timezone and near-midnight tests keep dates stable
- adjacent-month grid dates load correctly
- mixed plan/event days and empty months render correctly
- screen-reader labels identify marker meaning

Stop after Step 9 and wait for explicit approval before Step 10.

### Step 10. Add Fast Capture And Navigation Restoration

Workstream title:

`Add Journal fast capture and navigation restoration`

Scope:

- add Journal `Log` and Planner `Add plan` header actions
- reuse Search with an explicit Journal intent
- return users to the originating Journal view after completion or cancellation
- restore practical filters, scroll position, Calendar month, and selected date
- provide a sign-in path before opening a form for signed-out users

Expected outcome:

- users can begin the core Journal actions from the Journal header
- Search has one implementation with intent-aware return behavior
- Journal context survives common Title Details and modal navigation

Verification:

- each Journal view launches the correct intent
- cancel and successful save both return to the expected source
- signed-out users do not enter an unsavable form
- restoration behavior is checked on iOS and Android

Stop after Step 10 and wait for explicit approval before Step 11.

### Step 11. Complete Integration Testing And UX Hardening

Workstream title:

`Complete Journal integration testing and UX hardening`

Scope:

- verify every TAR-119 acceptance example end to end
- audit accessibility, localization, large text, loading stability, and feedback
- test failed queries, failed saves, retries, and concurrent submissions
- verify migration behavior and cross-user privacy
- check query size, pagination, month loading, and cache consistency
- run the repository quality commands and document results

Expected outcome:

- the complete Journal journey is production-ready
- all acceptance examples pass or have an explicitly approved exception
- no stale counts, duplicate actions, date shifts, or cross-user exposure remain

Verification:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run test` or the repository's approved test command passes
- database migration and RLS verification is recorded
- manual iOS and Android Journal checklist is recorded

Stop after Step 11. Mark the phase complete only after final user approval.

## TAR-119 Acceptance Mapping

| TAR-119 example | Primary step(s) |
| --- | --- |
| 1. A July 30 plan does not appear in today's Timeline | 7, 8 |
| 2. The plan appears in Planner and July 30 Calendar | 8, 9 |
| 3. Logging on July 30 creates a July 30 Timeline event | 4, 7 |
| 4. Logging the same title creates another event, not another title row | 2, 4 |
| 5. Each watch has its own rating and note | 2, 5, 6 |
| 6. A completed title can have a future rewatch plan | 2, 4, 8 |
| 7. Editing rating does not change the watch date | 4, 5, 7 |
| 8. Private Notes have no spoiler gate | 5, 7 |
| 9. Someday appears in Planner but not Calendar | 2, 8, 9 |
| 10. System timestamps never become user Journal dates | 2, 3, 7, 9 |
| 11. Title Details shows compact Your Journal information | 3, 6 |
| 12. Edit latest watch changes only that watch | 4, 6 |
| 13. History exposes independent edit/delete for every watch | 3, 4, 6 |
| 14. Removing a plan preserves history | 4, 6, 8 |
| 15. Removing a title warns about plan and history removal | 6 |
| 16. Failed save preserves form input and allows retry | 5 |
| 17. Dirty form dismissal asks before discarding | 5 |
| 18. Dates remain correct near midnight and across timezones | 2, 3, 9, 11 |
| 19. Missing/unreleased provider metadata does not block logging | 5 |
| 20. Timeline cannot be sorted by title or rating | 7 |
| 21. Planner and Lists do not mutate each other | 8, 11 |
| 22. Journal view state is restored after Title Details | 9, 10 |
| 23. Calendar meaning does not rely on color | 9, 11 |
| 24. Signed-out users see a clear sign-in path before forms | 6, 10 |
| 25. Failed Journal-state queries do not expose duplicate actions | 3, 6, 11 |

## Verification Matrix

Every implementation step should use the smallest proportional verification,
with the full suite in Step 11.

| Area | Required verification |
| --- | --- |
| Schema | constraints, indexes, migration counts, rollback path |
| Privacy | two-user RLS select/insert/update/delete checks |
| Lifecycle | deterministic transition and failure-path tests |
| Dates | local today, past/future boundaries, timezone and midnight cases |
| Forms | validation, retry, pending submission, dirty dismissal |
| Queries | loading/error distinction, pagination, cache invalidation |
| Timeline | strict chronology, rewatches, filters, stable ordering |
| Planner | section membership, one active plan, plan resolution |
| Calendar | events/plans separation, accessible markers, month ranges |
| Title Details | state/action matrix, summary fallback, History operations |
| Navigation | source restoration, signed-out path, iOS and Android behavior |
| Regression | Lists independence and existing media navigation |

## Implementation Tracking

Update this table only when work actually changes state.

| Step | External tracker | Status | Approval / verification note |
| --- | --- | --- | --- |
| 1. Implementation contract | Not used | Complete | Approved July 28, 2026 |
| 2. Schema and migration | Not used | Complete | Migration, backfill, RLS, indexes, generated types, and local verification completed July 28, 2026 |
| 3. Data layer | Not used | Complete | Typed read models, bounded queries, date-range loading, cache keys, invalidation, and focused verification completed July 28, 2026 |
| 4. Lifecycle transitions | Not used | Complete | Atomic owner-scoped RPCs, request idempotency, recomputation, rollback verification, and client mutation hooks completed July 29, 2026 |
| 5. Intent-based modal | Not used | Complete | Focused intent forms, resilient save behavior, local-date rules, and dismissal protection completed July 29, 2026 |
| 6. Your Journal and History | Not used | Complete | Compact summary, state-aware actions, on-demand History, and precise removals completed July 29, 2026 |
| 7. Timeline | Not used | Complete | Dated event cards, rewatch inference, compact filters, and stable pagination completed July 29, 2026 |
| 8. Planner | Not used | Complete | Today/Upcoming/Missed/Someday sections and plan-only management completed July 29, 2026 |
| 9. Calendar | Not used | Complete | Range-based event/plan calendar, accessible markers, and retained selection completed July 29, 2026 |
| 10. Fast capture and restoration | Not used | In progress | Authorized as part of the approved Steps 5-10 continuous delivery |
| 11. Quality hardening | Not used | Not started | Blocked by Step 10 approval |

## Decision Log

| Date | Decision | Status |
| --- | --- | --- |
| July 27, 2026 | Use a descriptive implementation filename paired with `journal-refinement.md` | Approved |
| July 27, 2026 | Use one title-state row, an explicit active-plan flag/date, and many dated events | Approved |
| July 27, 2026 | Use 11 ordered implementation workstreams under TAR-119 | Approved |
| July 27, 2026 | Require staged migration and delay obsolete-column removal until verification | Approved |
| July 28, 2026 | Approve the implementation contract and ordered 11-step phase | Approved |
| July 28, 2026 | Track the phase in this document without Linear sub-issues | Approved |
| July 28, 2026 | Confirm v1 `started_on` means `Dropped on` for dropped rows and backfill it as a `stopped` event | Implemented |
| July 28, 2026 | Grant authenticated CRUD explicitly on `journal_events` while enforcing owner-only RLS | Implemented |
| July 28, 2026 | Retain all legacy Journal columns until a later verified cleanup migration | Implemented |

## Step 2 Completion Record

Completed July 28, 2026.

- Added `has_active_plan` and `planned_for` to the title-state row.
- Added private `journal_events` history with ownership constraints, event/rating/Notes checks, indexes, timestamps, RLS, and explicit authenticated Data API privileges.
- Backfilled planned, completed, in-progress, and dropped rows only from user-selected dates.
- Preserved undated completed rows without inventing an event date.
- Kept all legacy source columns for the staged rollout.
- Added an exact-pinned Supabase CLI and local project configuration.
- Regenerated `lib/supabase/types.ts` from the migrated local schema.
- Replayed the complete migration history successfully.
- Verified representative backfill twice to prove it does not duplicate events.
- Verified cross-owner parent attachment fails and owner-only RLS reads/updates work.
- Verified RLS, authenticated CRUD grants, anonymous denial, four policies, and required indexes.
- Ran Supabase security/performance advisors. Warnings were limited to pre-existing policies on older tables; the new `journal_events` policies produced no warning.
- Passed typecheck, lint, and all 70 repository tests.
- Did not apply the migration to a hosted Supabase project.

## Step 3 Completion Record

Completed July 28, 2026.

- Added feature-owned title-state, active-plan, event, summary, History,
  Timeline, Planner, and Calendar types.
- Added narrow row-to-view-model mapping with explicit status, event-type,
  media, and date-only validation.
- Added a Title Journal summary query that distinguishes a missing title row
  from a failed request and returns the latest completed event plus an exact
  completed-watch count.
- Added bounded, deterministic keyset pagination for History and Timeline using
  `event_date` first and system metadata only as stable tie-breakers.
- Added an active-plan Planner query classified from an explicit device-local
  `today` date into Today, Upcoming, Missed, and Someday.
- Added a Calendar query that loads logged events and scheduled plans separately
  for the requested visible grid range. Unscheduled plans are excluded.
- Added v1.1 query keys and targeted invalidation for Title Details, History,
  Timeline, Planner, and only affected cached Calendar ranges.
- Added a guarded `canCreateTitleState` result that remains false during loading
  and on failure, preventing duplicate-creating actions from treating an error
  as an empty state.
- Kept existing v1 Journal screens on their current data path; switching each
  surface to these reads remains in its approved later implementation step.
- Passed all 78 tests, TypeScript typechecking, and lint.

## Step 4 Completion Record

Completed July 29, 2026.

- Added security-invoker database operations for saving, rescheduling, moving,
  and removing an active plan; logging activity; editing or deleting one event;
  and removing the complete Journal title.
- Kept the existing owner-only RLS policies active inside every operation,
  revoked default/anonymous function execution, and granted each lifecycle RPC
  explicitly to authenticated users.
- Added per-event operation IDs with a user-scoped unique index. Replaying the
  same request returns its existing event; reusing that ID for different data
  fails instead of silently changing history.
- Locked the title-state row before related event changes so concurrent calls
  serialize consistently and the unique user/title constraint remains the
  final protection against duplicate title rows.
- Implemented deterministic current-state recomputation from `event_date`, then
  serialized creation metadata and event ID. System metadata is never promoted
  to the user-visible activity date.
- Applied context-specific plan resolution in the client contract: Planner and
  planned-title activity resolves the plan, while previous-watch History and
  historical edits preserve it.
- Added explicit final-event deletion outcomes: keep the title in Someday or
  remove it. An undecided request fails and rolls back the event deletion.
- Added purpose-specific mutation APIs and hooks with input/result validation,
  in-flight request coalescing, v1.1 targeted invalidation, and staged v1 cache
  compatibility.
- Added a rollback-only SQL transition matrix covering plan changes, first
  watches, rewatches, previous watches, start/stop/resume, plan resolution,
  event edit/delete, title removal, idempotent retry, failed-write rollback,
  one-title uniqueness, and cross-owner denial.
- Replayed the lifecycle migration and passed the SQL transition matrix against
  an isolated local Postgres 17 Supabase database. No hosted database was
  changed.
- Passed all 89 application tests, TypeScript typechecking, and lint.

## Step 5 Completion Record

Completed July 29, 2026.

- Replaced the status-first modal with focused plan, edit-plan, log, rewatch,
  previous-watch, start, resume, finish, stop, and selected-event edit modes.
- Removed headline and spoiler controls from the active Journal flow and stored
  rating and Notes on each completed event.
- Used device-local dates, rejected future activity and past new plans, and kept
  provider release metadata as a non-blocking warning.
- Preserved entered values and stable request IDs across recoverable failures,
  prevented repeat submissions, and warned before discarding dirty forms.
- Added accessible rating adjustment and save announcements, intent-specific
  labels and feedback, focused form tests, and event-level read support.
- Passed focused tests, TypeScript typechecking, and lint without Docker.

## Step 6 Completion Record

Completed July 29, 2026.

- Replaced `Your Entry` with a compact `Your Journal` summary containing the
  current state, active plan, watch count, latest completed date, latest rating,
  and latest Notes preview.
- Replaced generic add/edit controls with a media- and state-aware primary,
  secondary, and More action model.
- Added on-demand paginated History with independent edit and delete actions
  for every dated activity.
- Added distinct confirmations for deleting activity, removing only a plan,
  deleting the final activity, and removing the complete Journal title.
- Kept Journal actions disabled while title state is loading or failed, and
  retained separate List and trailer actions.
- Passed focused action/read/mutation tests, TypeScript typechecking, and lint.

## Step 7 Completion Record

Completed July 29, 2026.

- Rebuilt Timeline from dated `journal_events`; active plans and system
  timestamps no longer determine visible activity.
- Rendered multiple watches of one title as independent cards and inferred
  rewatch labels from the title's earliest completed event.
- Kept event-specific rating and Notes on each card and grouped solely by the
  user-selected event date in reverse chronological order.
- Added compact title search plus media, activity, rating, and date filters,
  with active-filter empty states and no title/rating sorting controls.
- Added bounded earlier-activity loading with stable database ordering and
  preserved current results when a later page fails.
- Passed focused Timeline/read/query tests, TypeScript typechecking, and lint.

## Step 8 Completion Record

Completed July 29, 2026.

- Added Planner as the third Journal navigation view and classified every
  active plan into Today, Upcoming, Missed, or Someday from the device-local day.
- Added plan-aware log/start actions, including completed-title rewatch plans,
  and resolved those plans through the existing atomic lifecycle operations.
- Added schedule/reschedule, Move to Someday, and Remove plan controls with
  plan-specific confirmation and failure feedback.
- Kept completed state visible alongside future rewatch plans, retained one
  active plan per title, and left Lists completely independent.
- Passed focused Planner classification/action and lifecycle tests, TypeScript
  typechecking, and lint.

## Step 9 Completion Record

Completed July 29, 2026.

- Rebuilt Calendar from the visible six-week event/plan range, including
  adjacent-month dates, without using system timestamps as Journal dates.
- Rendered logged activity and scheduled plans with different colors and
  different icon shapes, plus screen-reader labels that state both meanings.
- Added separate Logged and Planned groups for the selected day; a mixed day
  retains both and an unscheduled Someday plan is excluded by the query.
- Enabled future month navigation, replaced the v1 metric tiles with one
  factual watches/plans summary, and kept the grid as the primary surface.
- Lifted selected month/day state above the Calendar view so Title Details
  navigation does not reset the user's place.
- Passed focused range, mixed-day, local-date, read, and query tests, TypeScript
  typechecking, and lint.

## Approval Checklist For Step 1

Before marking this document Approved, confirm:

- [x] The proposed document scope is complete.
- [x] The title-state and active-plan representation is approved.
- [x] The `journal_events` contract is approved.
- [x] The migration handling for ambiguous legacy dates is approved.
- [x] The atomic transition approach can be finalized during the schema step.
- [x] The 11 proposed implementation workstreams and order are approved.
- [x] The acceptance mapping covers TAR-119 completely.
- [x] Implementation may proceed to Step 2 after a separate explicit instruction.

## Next Review Action

Step 9 is complete. The user authorized continuous delivery through Step 10,
with one commit per step. Step 10 is the active implementation action.
