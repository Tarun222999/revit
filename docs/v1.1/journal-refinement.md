# Revit v1.1 Journal Refinement

## Document Status

- Status: Approved product direction
- Scope: Journal core-flow and end-to-end UX changes
- Implementation: Approved through `docs/v1.1/journal-refinement-implementation.md`
- Last updated: July 28, 2026
- Review pass: Title Details, entry actions, history, Planner, Timeline,
  Calendar, form resilience, deletion, accessibility, and data ownership

This document defines the approved v1.1 Journal product direction and overrides
conflicting v1 Journal behavior. Implementation is authorized only through the
approved ordered phase in `docs/v1.1/journal-refinement-implementation.md`.

## Purpose

Revit is a journal-first entertainment app. The current Journal implementation
tracks one mutable record per title, which works for collection management but
does not fully support a personal diary.

The v1.1 direction should distinguish between:

- what the user intends to watch
- the user's current relationship with a title
- what the user actually watched and when
- repeated watches of the same title

## Problems To Solve

### 1. Plans appear as activity on the wrong date

The current Calendar is based on the date a journal record was created. If a
user adds a movie today and plans it for July 30, it appears as activity today.

Creating a plan is not the same as watching something. The planned date should
control where the plan appears.

### 2. A title can only be logged once

The current unique title record is useful for storing the user's current state,
but it prevents a movie from being logged again as a rewatch.

A title should exist once in the user's collection while supporting many dated
viewing records.

### 3. System timestamps are being treated as journal dates

Fields such as `created_at`, `updated_at`, and `last_activity_at` are useful for
storage, synchronization, and management sorting. They should not decide the
date displayed in a personal diary.

Journal dates should come from dates explicitly selected by the user.

### 4. One date field has multiple meanings

The current `started_on` field can represent a planned date, start date, or
dropped date depending on status. These are different concepts and should not
share one field in v1.1.

### 5. Spoiler handling adds friction without current value

Revit has no community, public reviews, or shared feed. A spoiler toggle does
not protect another reader in the current personal-only experience.

Spoiler handling should be removed from the private journal flow. If publishing
or sharing is introduced later, a content warning can be added to that separate
publishing flow.

### 6. `Edit Entry` no longer has one clear meaning

Once a title can have a current state, an active plan, and several dated
watches, a generic `Edit Entry` action becomes ambiguous. The user must know
whether they are editing the plan, the latest watch, an older watch, or the
title's current status.

Every edit action should name its target.

### 7. Deleting a watch is not the same as removing a title

Deleting one viewing record should preserve the title, its other watches, and
its active plan. Removing the title from Journal is a larger destructive action
that can remove the plan and complete history.

These actions need different labels, confirmations, and consequences.

### 8. The current form asks the user to understand the data model

The v1 modal begins with a generic status selector and changes the meaning of
the date field based on that status. A faster flow starts with the user's
intent: plan, start, log, finish, stop, or rewatch.

### 9. Timeline controls conflict with Timeline meaning

Sorting a Timeline by title or rating stops it from being chronological.
Timeline should remain a dated diary. Collection-style sorting belongs in
Planner or a future library surface.

### 10. External release metadata can be incomplete

TMDB release dates can be missing, regional, or different from a premiere the
user attended. Revit should not prevent a user from recording a real watch
solely because provider metadata says the title is unreleased. A calm warning
is acceptable; silently changing or clearing the user's input is not.

## Proposed Product Principles

1. Plans are future intentions, not historical journal activity.
2. One title can have many dated viewing records.
3. Timeline and Calendar dates come from user-selected dates.
4. Database timestamps remain implementation metadata.
5. Planning and completion are related but independent concepts.
6. A previously completed title can be planned again for a rewatch.
7. The private logging flow should be fast and should not include social-only
   controls.
8. User-facing actions name the exact record they change.
9. The user's chosen date is the source of truth for personal activity.
10. A title's current state, active plan, and dated history remain distinct.
11. The UI uses natural media-specific language while the data model stays
    normalized.
12. The app preserves user input through validation and recoverable failures.

## User-Facing Terminology

Avoid using `entry` as a catch-all in the interface.

- `Your Journal`: the title-level summary on Title Details
- `Plan`: the user's current intention to watch the title
- `Watch`, `Finish`, `Start`, or `Stop`: a dated event
- `History`: all dated events for one title
- `Rewatch`: a later completed watch inferred from earlier history
- `Remove plan`: remove only the current plan
- `Delete watch`: remove one dated watch
- `Remove from Journal`: remove the title, its plan, and its history

Internal table and type names may remain technical, but buttons, confirmations,
errors, and empty states should use these precise user-facing terms.

## Journal Navigation

The Journal should use a three-option segmented control:

`Timeline | Planner | Calendar`

These are navigation tabs, not title actions.

### Timeline

Timeline is the default Journal view.

It shows dated events that actually happened, such as:

- started watching
- watched or finished
- rewatched
- stopped watching

Timeline rules:

- group events by the user-selected event date
- never place a plan in Timeline merely because it was created or edited
- never use `created_at` or `updated_at` as the visible journal date
- allow multiple events for the same title
- label later completion events as rewatches where appropriate
- keep the default order reverse chronological
- do not offer title or rating sorting inside Timeline
- allow filtering by media type, event type, rating, and date range
- show the event label more prominently than the title's current status
- count watch or finish events separately from unique titles

Timeline should provide a compact search and filter entry point rather than
placing the full v1 filter board above the diary on every visit. Active filters
must remain visible and easy to clear.

### Planner

Planner shows titles the user intends to watch.

Recommended sections:

- Today: plans scheduled for the current local date
- Upcoming: future plans ordered by planned date
- Missed: past plans that have not been resolved or rescheduled
- Someday: plans without a date

Planner rules:

- a planned date is optional
- planning a title does not create a Timeline event
- a completed title can return to Planner for a future rewatch
- completing a plan clears or resolves that active plan
- rescheduling changes the plan without creating false viewing activity
- creating a new dated plan should use today or a future local date
- a missed plan should offer `Log watch`, `Reschedule`, and `Move to Someday`
- removing a plan must not delete existing watch history
- only one active plan per title is required for this v1.1 scope

Planner and Lists serve different jobs:

- Planner answers what the user intends to watch and optionally when.
- Lists organize titles by theme, preference, or collection.
- Adding a title to a list does not plan it.
- Planning a title does not add it to a list.

### Calendar

Calendar combines historical events and future plans without treating them as
the same kind of activity.

Calendar rules:

- dated start, watch, finish, and stop events appear on their event dates
- plans appear on their planned dates
- plans and completed activity use different markers or colors
- markers must also differ by shape or icon so meaning is not color-only
- an unscheduled plan does not appear in Calendar
- future-month navigation is allowed when scheduled plans exist
- selecting a day can show separate `Logged` and `Planned` sections
- a day containing both types shows both markers
- the selected day defaults to today when viewing the current month
- the calendar returns to the previously selected month and day after opening a
  title and navigating back

The Calendar should prioritize the grid and selected-day payoff. Remove the v1
summary tiles such as `Best day`, `Active days`, and average rating. Replace
them with one compact factual month summary such as
`July · 3 watches · 2 plans`. Final spacing and copy can be refined during the
wireframe review.

Example:

- A movie is added on July 27 and planned for July 30.
- It appears in Planner immediately.
- It appears on July 30 in Calendar as a plan.
- It does not appear in the July 27 Timeline.
- If watched on July 30, a viewing event is created for July 30 and the active
  plan is resolved.

## Title-Level Actions

Title Details should show one clear primary action, one secondary action when
useful, and place less-common actions in a `More` menu. Do not present several
equal-weight buttons competing for attention.

Recommended actions:

| Title state | Primary action | Secondary action | Additional actions |
| --- | --- | --- | --- |
| Not in Journal, movie | Log a watch | Plan to watch | Add to List |
| Not in Journal, series or anime | Start watching | Plan to watch | Add to List |
| Planned movie | Log as watched | Edit plan | Remove plan, Add to List |
| Planned series or anime | Start watching | Edit plan | Remove plan, Add to List |
| In-progress movie | Mark watched | Update status | Stop watching, View history |
| Completed movie | Log a rewatch | View history | Plan a rewatch, Add to List |
| Finished series or anime | Start a rewatch | View history | Plan a rewatch, Add to List |
| In-progress series or anime | Mark finished | Update status | Stop watching, View history |
| Stopped title | Resume watching | Plan again | View history, Remove from Journal |

When signed out, Journal actions should lead to a clear sign-in prompt rather
than opening a form that cannot be saved. If the user's Journal state failed to
load, disable actions that could create duplicates and show Retry.

## Title Details: `Your Journal`

Do not hide Journal information from the movie or series page. Replace the v1
`Your Entry` card with a `Your Journal` summary.

When history exists, show:

- current state
- active plan, if any
- watch or finish count
- most recent completed watch date
- rating from the most recent watch, including `Not rated` when appropriate
- latest note preview, if present
- `View history` when more detail exists

When no completed watch exists, show the most relevant current information,
such as `Planned for July 30`, `Someday`, or `Started July 12`.

Do not use a generic `Edit Entry` button. Use precise actions:

- `Edit plan`
- `Edit latest watch`
- `Update status`
- `View history`
- `Remove from Journal`

The latest-watch preview may expose `Edit latest watch` through a small edit or
overflow action. `View history` opens a focused history surface listing every
dated event in reverse chronological order. Each history row can be edited or
deleted independently.

The full history may be an expandable Title Details section, modal, or pushed
screen. The wireframe step should choose the smallest option that stays usable
with several records; the behavior and edit semantics must not depend on that
presentation choice.

The UI may use media-specific language while retaining normalized internal
values. For example:

| Internal state | Movie label | Series or anime label |
| --- | --- | --- |
| `planned` | Plan to watch | Plan to watch |
| `in_progress` | Watching | Watching |
| `completed` | Watched | Finished |
| `dropped` | Stopped | Stopped |

## Add And Edit Flow

The modal should adapt to the user's intent rather than show every field at
once.

The launching action determines the initial form mode. Do not require the user
to choose a generic status before the form can explain what date or fields mean.

### Planning

Show:

- optional planned date
- save plan action

Do not require or prominently show:

- rating
- review or note
- spoiler control

### Logging a watch or finish

Show:

- watched or finished date, defaulting to today
- optional rating
- optional personal note

### Logging a rewatch

Logging a rewatch opens a form for the new watch date, rating, and note. Saving
adds another item to the title's history while preserving every previous watch.

Example:

- July 10: first watch, rating 4.0, original note preserved
- July 30: rewatch, rating 4.5, new note stored separately

The title remains one item in Journal and its watch count becomes two.

### Starting or stopping

For series and anime, starting or stopping should use focused forms:

- `Start watching`: start date defaults to today
- `Mark finished`: finish date defaults to today, with optional rating and note
- `Stop watching`: stopped date defaults to today, with an optional note
- `Resume watching`: creates a new start event without erasing the earlier stop

This scope does not include episode or season progress.

### Form defaults and date rules

- a new plan has no default date and therefore starts in `Someday`
- a watch, finish, start, or stop date defaults to the user's current local date
- a watch or activity date can be today or in the past, but not in the future
- a newly selected planned date can be today or in the future
- store journal dates as date-only values so timezone conversion cannot move an
  event to a neighboring day
- format dates using the device locale
- use the device's local day for `Today`; do not derive it from a UTC ISO
  timestamp
- editing an event date moves that event in Timeline and Calendar
- editing a rating or note does not change the event date or move it to today

Provider release metadata may trigger a non-blocking warning, but it must not
force a title into Planned, clear the form, or prevent saving a real watch.

### Active plan resolution

Confirmed behavior:

- `Log watch` from Planner resolves the active plan.
- `Mark watched` on a planned title resolves the active plan.
- `Add previous watch` from History creates a backdated event without changing
  a future plan.
- editing a historical event never resolves or changes an active plan.

This context-specific behavior avoids a `Complete current plan` toggle inside
the logging form.

### Form resilience

- disable repeated submission while save is pending
- keep every entered value visible after validation or network failure
- show field errors near their controls and a calm summary near Save
- warn before dismissing a dirty form through close, back, or gesture dismissal
- do not show the discard warning when nothing changed
- announce a specific success result such as `Plan saved`, `Watch logged`, or
  `Changes saved`
- refresh Title Details, Timeline, Planner, and the affected Calendar month
  after a successful mutation

### Rating and notes

Confirmed v1.1 direction:

- remove the spoiler toggle
- remove the optional headline
- use `Notes` as the personal-text label
- store rating and Notes on the dated viewing record
- show the latest watch's rating on title summaries
- show every rating and note in the title's history

The focused logging form therefore contains a date, an optional rating, and one
optional Notes field.

The rating control must support tap or drag, a clear action, visible half-step
values, and accessible increment/decrement behavior. The v1 slider should be
re-evaluated on real mobile devices rather than kept only because it already
exists.

## Editing, Deletion, And State Consistency

### Editing a dated event

- edit only the selected event's date, rating, and note
- preserve all other historical events
- do not silently change an active plan
- recompute ordering and summaries from the edited event date
- use the exact event label in the form title, such as `Edit watch` or
  `Edit finish`

### Deleting one event

- label the action `Delete watch`, `Delete finish`, or `Delete activity`
- explain that other history and the title remain
- if the deleted event was the latest watch, fall back to the next most recent
  watch in the Title Details summary
- only reconsider current status when the deleted event was the latest
  status-defining event
- if no events and no active plan remain, ask whether to keep the title in
  `Someday` or remove it from Journal

### Removing a plan

- label the action `Remove plan`
- preserve all watch history
- if the title has no history or other state, remove the now-empty title-state
  record as part of removing the plan
- do not use the same destructive confirmation as removing the title
- a lightweight confirmation or undo message is sufficient because history is
  not deleted

### Removing the title

- label the action `Remove from Journal`
- state the number of watches or activities that will also be removed
- state whether an active plan will be removed
- require explicit destructive confirmation
- keep this action separated from routine edit controls

The data mutation must keep the current title state and dated event consistent.
The schema-design phase should choose an atomic mutation strategy so a status
update cannot succeed while its corresponding history event fails, or vice
versa.

## Journal-Wide UX Rules

### Fast capture

Journal should have a visible `Log` action in its header. It can reuse Search in
an intent-aware mode rather than create a second title-search implementation.

- from Timeline or Calendar, `Log` starts a title search for logging activity
- from Planner, `Add plan` starts a title search for planning
- returning from the flow restores the previous Journal view and scroll state

### Search, filters, and counts

- provide `Search your Journal` for larger histories
- Timeline filters target event date, media type, event type, and rating
- Planner filters target media type and Scheduled, Missed, or Someday state
- Calendar may offer a lightweight media filter but should not inherit hidden
  Timeline filters
- show active-filter count and a one-tap clear action
- distinguish unique title counts from watch counts in copy
- avoid showing media type twice on the same compact card

### View-specific empty states

- Timeline: explain that actual watches and activity will appear here
- Planner: invite the user to plan a title or move one to Someday
- Calendar month: show a quiet empty month without treating it as an error
- History: explain that the first completed watch creates history
- Filtered results: show the active filter summary and `Clear filters`

### Loading, errors, and feedback

- use stable skeleton dimensions to avoid layout jumps
- preserve already loaded content during background refresh
- retry failed sections without forcing the user away from the screen
- keep unsaved form values after a failed save
- prevent duplicate records from repeated taps or concurrent saves
- use specific success feedback and return the user to the action's source
- never show stale counts after a successful mutation

### Accessibility and localization

- all tap targets should be comfortably sized for mobile
- segmented tabs expose selected state to assistive technology
- Calendar meaning must not rely on color alone
- cards need useful screen-reader labels including title, event, date, and
  rating when present
- rating supports screen-reader increment, decrement, and clear actions
- date labels and week layout should respect device locale where practical
- text must remain usable with larger accessibility font sizes
- destructive actions must not be adjacent to primary save actions without
  clear spacing and hierarchy

### History size and navigation

- Timeline should support bounded or paginated loading rather than requiring
  the user's complete history in one response
- Calendar should load the visible month plus adjacent data needed for its grid
- Title Details can load its compact summary first and fetch full history only
  when requested
- query and cache design must keep Timeline, Planner, Calendar, and Title
  Details consistent after mutations

## Proposed Data Model Direction

The database should separate the title's current state from its dated history.
Exact names and constraints require a dedicated schema review before
implementation.

### Title state: one record per user and media item

The existing `journal_entries` concept can continue to represent the title in
the user's Journal.

Responsibilities:

- user ownership
- media item relationship
- current status
- optional active `planned_for` date
- optional plan metadata required by the approved Planner design
- current management timestamps

The unique relationship between user and media item remains useful at this
level. It prevents duplicate title cards, not duplicate viewing history.

Current-state rules:

- a title with an active plan and no later activity is `planned`
- starting or resuming sets the current state to `in_progress`
- completing a watch or finish sets the current state to `completed`
- stopping sets the current state to `dropped`
- planning a rewatch for a completed title does not replace its completed state
- editing an older event does not change current state
- deleting the latest status-defining event recomputes state from the latest
  remaining event and active plan
- a title can be completed and still have a separate active rewatch plan

### Dated history: many records per journal title

Add a one-to-many history table, provisionally named `journal_events` or
`journal_logs`.

Possible responsibilities:

- parent journal entry
- user ownership
- event date
- event type
- optional rating
- optional personal note
- system creation and update timestamps

A first watch and every rewatch create separate rows. Rewatch does not need to
be a permanent database event type if it can be inferred from an earlier
completion event for the same title.

Recommended event types for schema review are:

- `started`
- `completed`
- `stopped`

The UI can label a movie completion as `Watched`, a series completion as
`Finished`, and any later completion as `Rewatched` or `Finished again`.
Rewatch does not need a separate stored event type because it can be inferred
from earlier completion events.

Multiple events on the same date must be allowed. Stable ordering can use event
date followed by system creation time.

### Date semantics

Proposed explicit meanings:

- `planned_for`: when the user intends to watch
- event date: when the logged activity actually happened
- `created_at`: when the database row was created
- `updated_at`: when the database row was last changed

These fields must not substitute for one another in the UI.

### Ratings and notes

The recommended direction is to store rating and personal text on the dated
event. This allows a user's opinion to change between the first watch and a
rewatch. Rating remains optional and uses the existing `0.5` to `5.0` scale.

Title Details displays the rating attached to the most recent completion event.
If the latest watch is unrated, it should say `Not rated` rather than silently
falling back to an older rating. Full history preserves earlier ratings.

Timeline rating filters should apply to the event being displayed, not to an
unrelated title-level rating.

### Ownership and access

All new personal journal records must remain private and user-owned.

Any new exposed table must:

- have Row Level Security enabled
- allow authenticated users to access only their own rows
- validate ownership on insert and update
- prevent a user from attaching history to another user's journal entry

Indexes and queries should support:

- user Timeline ordered by event date
- one visible Calendar month
- active Planner sections ordered by planned date
- title-specific history ordered by event date
- one title-state record per user and media item

The exact policies must be reviewed and verified during implementation.

## Existing Data Migration Direction

Existing journal data should be preserved through migration rather than reset.
No migration is authorized by this document; the schema phase must design and
verify it before execution.

The migration should:

- convert a completed entry with `completed_on` into an initial completion
  event
- move its rating and personal text onto that event
- convert a planned entry's current date into `planned_for`
- decide how to handle in-progress and dropped entries whose `started_on`
  value currently has different meanings
- discard or retire `contains_spoilers`
- avoid invented viewing dates when an existing completed entry has no
  reliable completion date

## Expected Screen Behavior

### Title Details

Show:

- current state
- active plan, if any
- most recent completed watch date
- rating and note from that most recent watch
- total watch or finish count
- actions appropriate to the current state
- access to complete history
- exact edit actions rather than `Edit Entry`

If the title is only planned, emphasize the plan. If it has history and a future
rewatch plan, show both without replacing its completed state.

### Timeline cards

Show:

- poster and title
- event label such as Watched, Finished, or Rewatched
- event date
- rating, if present
- short note preview, if present

The current title status should not compete visually with the historical event
label. Tapping the main card opens Title Details; an overflow action may open
event-specific edit controls.

Do not show a hidden spoiler message for the owner of a private note.

### Planner cards

Show:

- poster and title
- planned date or Someday
- current state when relevant
- `Log watch` or `Start watching`
- reschedule and move-to-Someday actions
- remove-plan action that preserves history

### History rows

Show:

- event type and media-appropriate label
- event date
- rating and note belonging to that event
- `Edit` and `Delete` actions for that event

History is reverse chronological and never merges separate rewatches.

### Calendar day panel

Show separate groups when both exist:

- Logged on this day
- Planned for this day

The day panel should use compact event and plan rows rather than the v1
title-state card. Its count copy must distinguish logs from plans.

## Non-Goals For This Change

This proposal does not introduce:

- community or public reviews
- spoiler moderation
- likes, comments, or follows
- episode-by-episode tracking
- season-by-season tracking
- watch-party planning
- notifications or reminders
- automatic scrobbling
- detailed time-spent tracking

Those features require separate product decisions.

## Proposed Acceptance Examples

1. Planning a movie for July 30 does not add it to today's Timeline.
2. The planned movie appears in Planner and on July 30 in Calendar.
3. Logging the movie on July 30 creates a Timeline event dated July 30.
4. Logging the same movie again creates another event without duplicating the
   title-level record.
5. Each watch can have its own rating and note.
6. A completed movie can be planned for a future rewatch.
7. Editing a rating does not move the watch to today's date.
8. A private note is visible to its owner without a spoiler gate.
9. Unscheduled plans appear in Planner but not Calendar.
10. System timestamps never appear as the user's chosen watch date.
11. Title Details shows `Your Journal`, current state, active plan, latest watch,
    and total watch count without rendering the entire history by default.
12. `Edit latest watch` changes only that watch.
13. `View history` exposes every watch and allows one record to be edited or
    deleted without overwriting the others.
14. Removing a plan preserves viewing history.
15. Removing a title clearly warns that its plan and history will be removed.
16. A failed save preserves all form input and allows retry.
17. Dismissing a changed form asks before discarding input.
18. Journal dates remain correct near midnight and across device timezones.
19. A real watch can be logged even when external release metadata is missing
    or claims the title is unreleased.
20. Timeline remains chronological and cannot be sorted by title or rating.
21. Planner and Lists remain separate concepts and do not change one another.
22. Returning from Title Details restores the active Journal view, filters,
    scroll position, and Calendar selection where practical.
23. Calendar markers remain understandable without relying on color alone.
24. Signed-out users receive a clear sign-in path before entering a form.
25. A failed Journal-state query cannot expose a duplicate-creating action.

## Confirmed Product Decisions

The following decisions are approved for the v1.1 Journal plan:

1. Journal uses `Timeline | Planner | Calendar` as its top-level views.
2. Each user/title pair has one title-state record and many dated history
   events.
3. A title supports unlimited rewatches.
4. Rating and Notes are stored per dated watch rather than once per title.
5. The private Journal flow does not include a spoiler toggle.
6. Title Details replaces `Your Entry` with `Your Journal`.
7. Generic `Edit Entry` is replaced with record-specific actions.
8. Personal text is labeled `Notes`.
9. The optional headline is removed.
10. `started`, `completed`, and `stopped` form the smallest event set.
11. Timeline is always chronological and uses filters rather than title or
    rating sorting.
12. A title has at most one active plan in this v1.1 scope.
13. Journal provides intent-aware `Log` and `Add plan` header shortcuts through
    the existing Search experience.
14. Provider release dates can warn but do not block an explicit watch, rating,
    or Notes entry.
15. Calendar replaces the v1 summary tiles with one compact factual month
    summary.
16. Existing journal data is preserved through a verified migration rather than
    reset.
17. Logging from Planner or marking a planned title watched resolves its plan;
    adding a previous watch from History preserves any future plan; the logging
    form does not show a `Complete current plan` toggle.

## Implementation Boundary

All product decisions in this document are approved. The separate v1.1
implementation phase, schema contract, and ordered sequence are approved in
`docs/v1.1/journal-refinement-implementation.md`. Follow that sequence one step
at a time and wait for explicit approval before beginning each next step.
