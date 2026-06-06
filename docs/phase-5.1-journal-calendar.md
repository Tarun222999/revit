# Phase 5.1 Journal Calendar

## Purpose

This document defines the Calendar follow-up after Phase 5 Journal Timeline.

Phase 5.1 should add the Calendar view to the Journal screen using the list query, entry view model, filter model, and navigation foundations established in Phase 5.

## Phase Goal

Build the Journal Calendar view.

By the end of Phase 5.1:

- Journal should support switching between Timeline and Calendar.
- Calendar should show created-date journal activity.
- Active days should communicate activity density.
- Active days may show media-type markers.
- Selecting a day should reveal entries created on that day.
- Calendar should reuse Phase 5 journal entries, filters, and navigation where practical.
- Calendar should feel like a logbook/activity map, not a plain date picker.

## Visual Direction

Use the Phase 5 mockup artifact as the current planning reference:

```text
docs/phase-5-journal-screen-mockups.html
docs/phase-5-journal-screen-mockups-preview.png
```

For Phase 5.1, use the Calendar direction from the mockups:

- Calendar should feel like a monthly logbook.
- Month-level summary tiles can make the view feel more alive.
- Active dates should have useful visual rhythm through density and media markers.
- Selected-day entries should be visible in the first viewport where practical, such as a bottom-sheet-like panel.
- The UI can be refined during implementation, but should preserve the core idea: activity map plus selected-day journal payoff.

## Non-Goals

Do not implement unrelated product work in Phase 5.1.

Specifically, do not implement:

- Lists or Add to List behavior
- Single List Details
- Profile stats
- Dashboard personalization
- settings or account-management flows
- new journal event history tables
- direct TMDB calls from the client
- game provider integration
- social, public profile, comments, or likes
- long-form reviews
- changing the Phase 5 Timeline model unless a bug requires it

Add to List remains Phase 6. Profile and Dashboard summary work remains Phase 7.

## Dependency On Phase 5

Phase 5.1 should begin only after Phase 5 has completed:

- `JournalListEntry` view model
- `getJournalEntries(userId)` API helper
- `useJournalEntries(userId)` hook
- reusable filter and sort helpers
- Timeline entry navigation to Title Details
- loading, empty, filtered empty, and error state patterns

If any of those foundations are missing, complete or repair them before building Calendar.

## Locked Product And Technical Direction

Phase 5.1 must follow the locked stack:

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

Phase 5.1 must follow the locked product rules:

- Journal uses Timeline and Calendar.
- Journal is management-focused.
- Profile is summary-focused and deferred.
- Lists are mixed-media by default and deferred to Phase 6.
- Calendar activity is based on entry created date for v1.
- External content APIs are not called directly from the client.

## Calendar Activity Contract

Calendar activity source:

```text
journal_entries.created_at
```

This is locked for v1 by `docs/STACK_DECISIONS.md`.

Calendar should not:

- use `completed_on` as activity for v1
- use `last_activity_at` as calendar activity for v1
- require a `journal_events` table
- imply detailed event history that does not exist yet

Completion dates can still appear inside entry details or Timeline cards where relevant, but they do not drive Calendar activity.

## Calendar View Model

Build Calendar models from filtered `JournalListEntry` values.

Recommended model:

```text
JournalCalendarMonth
  monthDate string
  days JournalCalendarDay[]
  totalEntries number
  activeDayCount number
  bestDay string | null
  averageRating number | null

JournalCalendarDay
  date string
  isCurrentMonth boolean
  entries JournalListEntry[]
  entryCount number
  mediaTypes MediaType[]
```

Month summary tiles may show:

- entries this month
- active days this month
- most active day
- average rating for rated entries this month

These are allowed as screen-local summaries because they help Calendar feel useful. Broader taste/profile stats remain deferred to Phase 7.

## Calendar Behavior

Month behavior:

- Show one month at a time.
- Default month can be the current month.
- If the current month has no entries and the user has entries elsewhere, it is acceptable to default to the most recent entry month if that feels better during implementation.
- Users should be able to move to previous and next months.

Day behavior:

- Active days show activity density.
- Active days can show media-type color markers.
- Selecting a day reveals entries created on that date.
- If a selected day has no entries, show a small empty selected-day state.

Entry behavior:

- Selected-day entries should reuse the Phase 5 entry card pattern in a compact form.
- Tapping a selected-day entry should navigate to Title Details.
- Spoiler review previews should remain protected.

Filter behavior:

- Calendar should respect the same active filters as Timeline.
- Calendar summary and active days should be based on the filtered entry set.
- Filtered empty state should let users clear filters.

Sort behavior:

- Calendar does not need to expose its own sort control for the month grid.
- Selected-day entries can use the current Timeline sort or a simple created-time order.
- Do not overbuild Calendar-specific sorting unless a clear UX need appears.

## State Contract

Loading state:

- Reuse Phase 5 Journal loading patterns where practical.

No entries state:

- If the user has no journal entries, reuse the Phase 5 no-entries empty state.

Filtered empty state:

- If filters remove all Calendar activity, show clear-filter behavior.

No activity in selected month:

- Show the month grid calmly with no active dates.
- Provide useful copy, but do not force navigation away from the month.

Selected day with no entries:

- Show a small selected-day empty state.

Error state:

- Reuse Phase 5 retry behavior.

## Navigation Contract

The Journal screen should support switching between:

```text
Timeline
Calendar
```

Use local screen state unless route params are clearly useful. Avoid creating separate routes for Timeline and Calendar in Phase 5.1.

Tapping a Calendar selected-day entry should navigate to Title Details using the same helper/path used by Timeline.

## Component Structure

Likely new files:

```text
features/journal/components/JournalCalendarView.tsx
features/journal/components/JournalCalendarGrid.tsx
features/journal/components/JournalCalendarDayPanel.tsx
features/journal/model/journalCalendar.ts
```

Likely updated files:

```text
features/journal/components/JournalScreen.tsx
features/journal/components/JournalFilterBoard.tsx
features/journal/model/journalList.ts
features/journal/types.ts
```

Only add extra components if the Calendar screen becomes hard to scan.

## Implementation Sequence

### 1. Finalize Phase 5.1 Calendar Contract

Expected outcome:

- this document exists
- Calendar activity source is confirmed as `created_at`
- Calendar dependency on Phase 5 is confirmed
- Calendar behavior and non-goals are confirmed
- implementation sequence is agreed

Stop after this step and wait for explicit approval before implementing Step 2.

### 2. Add Calendar View Model Helpers

Expected outcome:

- filtered `JournalListEntry` values can be grouped into month/day models
- activity density data exists
- media-type marker data exists
- month summary values are computed safely
- helpers do not mutate Timeline data

### 3. Enable Timeline/Calendar View Switching

Expected outcome:

- Journal screen can switch between Timeline and Calendar
- Timeline remains the default view
- existing Timeline behavior does not regress
- Calendar can initially render a simple placeholder fed by the month model

### 4. Build Calendar Grid

Expected outcome:

- month grid renders correctly
- previous and next month controls work
- active days are visually distinct
- selected day state works
- empty months remain readable

### 5. Add Activity Density And Media Markers

Expected outcome:

- days with more entries have stronger visual treatment
- media-type markers communicate mixed activity without clutter
- markers stay readable on mobile

### 6. Build Selected-Day Panel

Expected outcome:

- selected-day entries render below or over the grid in an integrated panel
- selected-day entries navigate to Title Details
- selected day with no entries has a calm empty state
- spoiler review previews remain protected

### 7. Add Calendar Summary Tiles

Expected outcome:

- month-level summary tiles render from filtered entries
- summaries stay screen-local and do not become Profile stats
- null/empty values are handled cleanly

### 8. Polish Calendar States

Expected outcome:

- no entries state reuses Phase 5 behavior
- filtered empty state includes clear filters
- no activity month state is useful
- loading and error states remain consistent

### 9. Verify Phase 5.1

Expected outcome:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run check` passes when environment permissions allow
- no client code calls TMDB directly
- Timeline still works
- Calendar activity is based on `created_at`
- selected-day entries are correct
- filters affect Calendar activity
- entry navigation works from Calendar

## Acceptance Criteria

Phase 5.1 is complete when:

1. `docs/phase-5.1-journal-calendar.md` exists.
2. Journal supports Timeline and Calendar switching.
3. Timeline remains functional from Phase 5.
4. Calendar shows one month at a time.
5. Calendar activity is based on `journal_entries.created_at`.
6. Active days communicate activity density.
7. Active days can show media-type markers.
8. Selecting a day reveals entries created on that date.
9. Calendar respects Phase 5 filters.
10. Calendar has loading, empty, filtered empty, no-month-activity, and error handling.
11. Tapping a Calendar entry navigates to Title Details.
12. Lists and Add to List remain deferred.
13. Profile and Dashboard summary work remains deferred.
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

- Open Journal and confirm Timeline still loads.
- Switch to Calendar.
- Confirm current or selected month renders.
- Create entries on different dates and confirm active dates.
- Select a date with one entry.
- Select a date with multiple entries.
- Select a date with no entries.
- Move to previous and next months.
- Apply media type filter and confirm Calendar activity changes.
- Apply status filter and confirm Calendar activity changes.
- Apply rating filter and confirm Calendar activity changes.
- Tap a Calendar entry and confirm Title Details opens.
- Confirm completed date does not drive Calendar activity.
- Confirm Add to List remains deferred.
- Confirm no app/client file contains direct TMDB URLs or credentials.

## Handoff To Phase 6

Phase 5.1 should leave the app with the full v1 Journal browsing surface:

- Timeline view
- Calendar view
- shared filters
- entry navigation
- Supabase-backed journal list data

Phase 6 can then build mixed-media Lists and Add to List behavior.
