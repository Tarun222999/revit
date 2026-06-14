# Phase 5 Journal Timeline

## Purpose

This document expands Phase 5 from `docs/feature-plan.md` into a concrete contract for the first real Journal screen implementation.

Phase 5 should replace the current Journal placeholder with a management-focused Timeline view backed by the user's saved journal entries. It should also establish the shared list query, view model, filtering, sorting, and navigation foundations that Phase 5.1 Calendar will reuse.

## Phase Goal

Build the Journal Timeline.

By the end of Phase 5:

- Journal should show the user's saved entries from Supabase.
- Journal should include a Timeline view as the default active view.
- Timeline should make recent journal activity easy to scan.
- Users should be able to filter by media type, status, and rating.
- Users should be able to sort by recent activity, recently added, rating, and title.
- Tapping an entry should navigate back to Title Details.
- Calendar should remain intentionally deferred to Phase 5.1.
- Journal should remain management-focused, while Profile summary work stays deferred.

## Visual Direction

Use the Phase 5 mockup artifact as the current planning reference:

```text
docs/phase-5-journal-screen-mockups.html
docs/phase-5-journal-screen-mockups-preview.png
```

For Phase 5, use the Timeline and filter direction from the mockups:

- Filters should feel like a compact journal lens, not a plain stack of chips.
- Timeline should feel refined, useful, and mobile-readable.
- The UI can be refined during implementation, but should preserve the core idea: counts, active filters, status/rating controls, sort, and grouped journal cards.
- Visual polish should use existing app tokens and components where possible.

The Calendar mockup remains a Phase 5.1 reference only.

## Non-Goals

Do not implement unrelated product work in Phase 5.

Specifically, do not implement:

- Calendar view
- calendar month grid
- calendar activity density
- selected-day calendar panel
- Lists or Add to List behavior
- Single List Details
- Profile stats
- dashboard personalization
- settings or account-management flows
- new journal event history tables
- direct TMDB calls from the client
- game provider integration
- social, public profile, comments, or likes
- long-form reviews

Add to List remains Phase 6. Profile summary work remains Phase 7. Calendar moves to Phase 5.1.

## Current Starting Point

Phase 4 and Phase 4.1 left the app with:

- `journal_entries` table with constraints, indexes, RLS, timestamps, and generated types.
- Title Details showing normalized media details and current Your Entry state.
- Add/Edit Journal Entry modal supporting create, update, and delete.
- Journal API helpers for title-specific entry CRUD.
- TanStack Query hooks for title-specific entry loading and mutations.
- Query invalidation rooted at `journalEntriesQueryKey(userId)`.
- `features/journal/components/JournalScreen.tsx` still rendering the Phase 5 placeholder.

Phase 5 should add list-oriented journal queries and Timeline UI without changing the modal CRUD contract unless a bug is discovered.

## Locked Product And Technical Direction

Phase 5 must follow the locked stack:

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

Phase 5 must follow the locked product rules:

- Journal is management-focused.
- Profile is summary-focused and deferred.
- Lists are mixed-media by default and deferred to Phase 6.
- External content APIs are not called directly from the client.
- Media metadata should come from normalized `media_items` data already persisted through the app's backend flow.

The broader v1 Journal feature includes Timeline and Calendar, but this phase deliberately implements Timeline first.

## Data Contract

Phase 5 should add a list query that fetches the current user's journal entries with their joined media item metadata.

Recommended Supabase shape:

```text
journal_entries
  id
  user_id
  media_item_id
  status
  rating
  review_headline
  review_body
  contains_spoilers
  completed_on
  created_at
  updated_at
  last_activity_at
  media_items
    id
    source
    source_id
    media_type
    title
    original_title
    description
    release_date
    image_url
    backdrop_url
    genres
    metadata
```

Use a feature-owned view model instead of passing broad joined database rows directly through UI components.

Recommended view model:

```text
JournalListEntry
  id string
  mediaItemId string
  source string
  sourceId string
  mediaType MediaType
  title string
  originalTitle string | null
  description string | null
  releaseDate string | null
  year string | null
  imageUrl string | null
  backdropUrl string | null
  genres string[]
  metadata Record<string, unknown>
  status JournalStatus
  rating number | null
  reviewHeadline string | null
  reviewBody string | null
  containsSpoilers boolean
  completedOn string | null
  createdAt string
  updatedAt string
  lastActivityAt string
```

Why include source and sourceId:

- Title Details navigation can remain compatible with existing normalized media routing.
- Future IGDB support can reuse the same shape.
- Phase 5.1 Calendar can reuse the same entry model without another query shape.

## Query Behavior

Recommended hook:

```text
features/journal/hooks/useJournalEntries.ts
```

Recommended API additions:

```text
features/journal/api/journal-api.ts
  getJournalEntries(userId)
```

Recommended query key:

```text
journalEntriesQueryKey(userId)
```

This already exists and should remain the broad invalidation root for create, update, delete, Timeline refreshes, and future Calendar refreshes.

Filtering and sorting can be performed client-side for the first v1 pass after fetching the user's entries. This keeps the first implementation simple and avoids premature backend query branching. If the entry count later becomes large, server-side filters can be added without changing the screen contract.

## Timeline Contract

Default Timeline sort:

```text
recent_activity
```

Use `last_activity_at desc` so entries edited recently resurface in the management view.

Timeline grouping:

- Group entries by month.
- For `recent_activity`, group by `last_activity_at`.
- For `recently_added`, group by `created_at`.
- For `rating` and `title`, grouping can still use `last_activity_at` for visual continuity unless implementation proves awkward.

Timeline entry card should show:

- poster or image fallback
- title
- year when available
- media type badge
- status badge
- rating badge when set
- review headline or short review preview when available
- activity date label

Review preview behavior:

- Prefer `review_headline` when present.
- Otherwise show a short `review_body` preview.
- If `contains_spoilers` is true, hide the review preview behind calm spoiler copy in the list card.

## Filter Contract

Filters should feel like a compact journal lens rather than a generic list of chips.

Media filter:

- All
- Movies
- Series
- Anime

Games remain excluded from the default v1 filter UI until game integration exists, but the underlying model should not break if a `game` entry exists.

Status filter:

- All
- Planned
- In Progress
- Completed
- Dropped

The mockup groups statuses visually into a status track, but the implementation can choose individual status pills if that is clearer on mobile.

Rating filter:

- Any rating
- Rated
- Unrated
- 4+
- 3+

Avoid every half-step as a filter in the first pass. It would create noise without much practical value.

Filter behavior:

- Filters compose together.
- Empty filtered results should show a clear-filter action.
- Active filters should be visible without opening a separate deep settings screen.
- Filter and sort model should be reusable by Phase 5.1 Calendar.

## Sort Contract

Sort options:

- Recent activity: `last_activity_at desc`
- Recently added: `created_at desc`
- Rating: `rating desc`, null ratings last
- Title: media title ascending

Sorting can be implemented as a compact menu or a small native-feeling control. Do not overbuild a custom picker if existing app primitives are enough.

## State Contract

Loading state:

- Show a calm loading state or lightweight skeletons.
- Avoid blocking the entire screen with unnecessary ceremony.

Empty state with no entries:

- Message should invite the user to search/add titles.
- Primary action can navigate to Search.

Filtered empty state:

- Message should say no entries match the current filters.
- Provide a clear-filter action.

Error state:

- Show a concise error and retry action.
- Preserve useful developer detail in thrown errors, but keep user copy calm.

Unauthenticated state:

- Follow existing auth/session patterns.
- Journal should not show fake data.

Calendar deferred state:

- The Timeline/Calendar segmented control may show Calendar as disabled or not render Calendar until Phase 5.1.
- If shown, Calendar should clearly indicate it is coming in Phase 5.1 and should not fake calendar data.

## Navigation Contract

Tapping a journal entry should navigate to Title Details.

Preferred navigation target should match the existing Title Details route contract. If Title Details currently expects a provider/source route ID rather than a persisted `media_items.id`, use the joined `media_items.source`, `source_id`, and `media_type` data to build the same route shape used by Search and Discover.

Do not create a new Journal-only title details route.

## Component Structure

Keep the route file thin:

```text
app/(tabs)/journal.tsx
  -> features/journal/components/JournalScreen.tsx
```

Likely new files:

```text
features/journal/components/JournalEntryCard.tsx
features/journal/components/JournalFilterBoard.tsx
features/journal/components/JournalTimelineView.tsx
features/journal/hooks/useJournalEntries.ts
features/journal/model/journalList.ts
```

Likely updated files:

```text
features/journal/api/journal-api.ts
features/journal/components/JournalScreen.tsx
features/journal/types.ts
```

Do not add `JournalCalendarView.tsx` in Phase 5.

## Implementation Sequence

### 1. Finalize Phase 5 Timeline Contract

Expected outcome:

- this document exists
- Timeline behavior is confirmed
- Calendar is explicitly deferred to Phase 5.1
- filter and sort options are confirmed
- list query data shape is confirmed
- non-goals are confirmed
- implementation sequence is agreed

Stop after this step and wait for explicit approval before implementing Step 2.

### 2. Add Journal List Types And View Model Mapping

Expected outcome:

- feature-owned list entry type exists
- joined Supabase rows are mapped into UI-friendly `JournalListEntry` values
- unsupported status/media values are handled clearly
- UI components do not depend on raw broad database join rows

### 3. Add Journal List API Helper And Query Hook

Expected outcome:

- `getJournalEntries(userId)` fetches user entries joined with media metadata
- `useJournalEntries(userId)` uses TanStack Query
- existing mutation invalidation refreshes the list query
- loading and error behavior is exposed cleanly to the screen

### 4. Add Journal Timeline Screen Shell

Expected outcome:

- placeholder is replaced with the real Journal Timeline shell
- screen has header, Timeline active state, and state handling
- route file remains thin
- Calendar remains deferred or disabled
- no Timeline cards are required yet beyond simple placeholders

### 5. Build Journal Filter And Sort Model

Expected outcome:

- media type, status, rating, and sort state are represented clearly
- filter and sort helpers are deterministic and testable where useful
- empty filtered result behavior can identify when filters are active
- helpers are reusable for Phase 5.1 Calendar

### 6. Build Journal Filter Board UI

Expected outcome:

- filters feel intentional and compact
- active filters are visible
- clear-filter action exists when useful
- controls remain readable and tappable on mobile

### 7. Build Timeline View

Expected outcome:

- entries render as grouped Timeline cards
- month grouping works
- sorting changes update entry order
- spoiler reviews are not exposed accidentally in previews
- tapping an entry navigates to Title Details

### 8. Polish Journal Timeline States

Expected outcome:

- no entries empty state is useful
- filtered empty state includes clear filters
- loading state feels consistent with the app
- error state includes retry
- unauthenticated behavior follows existing app patterns

### 9. Verify Phase 5

Expected outcome:

- `npm run typecheck` passes
- `npm run lint` passes
- `npm run check` passes when environment permissions allow
- no client code calls TMDB directly
- Journal entries appear after creating them from Title Details
- editing an entry updates Timeline order when recent activity is selected
- deleting an entry removes it from Timeline
- filters and sorting compose correctly
- entry navigation returns users to Title Details
- Calendar remains deferred to Phase 5.1

## Acceptance Criteria

Phase 5 is complete when:

1. `docs/phase-5-journal-screen.md` exists.
2. Journal uses real Supabase-backed entries joined with media metadata.
3. Journal has a real Timeline view.
4. Timeline groups entries by month.
5. Timeline defaults to recent activity.
6. Users can filter by media type, status, and rating.
7. Users can sort by recent activity, recently added, rating, and title.
8. Empty, filtered empty, loading, and error states exist.
9. Tapping a journal entry navigates to Title Details.
10. Calendar remains deferred to Phase 5.1.
11. Lists and Add to List remain deferred.
12. Profile summary work remains deferred.
13. No direct TMDB client calls are introduced.
14. `npm run typecheck` passes.
15. `npm run lint` passes.
16. `npm run check` passes when environment permissions allow.

## Verification Checklist

Run:

```text
npm run typecheck
npm run lint
npm run check
```

Manual checks:

- Create a planned entry from Title Details and confirm it appears in Journal.
- Create a completed rated entry and confirm rating/status display.
- Edit an older entry and confirm recent activity sorting moves it upward.
- Delete an entry and confirm it disappears from Timeline.
- Filter by media type.
- Filter by status.
- Filter by rating.
- Sort by recently added.
- Sort by rating.
- Sort by title.
- Tap a Timeline entry and confirm Title Details opens.
- Confirm Calendar remains deferred or disabled.
- Confirm Add to List remains deferred.
- Confirm no app/client file contains direct TMDB URLs or credentials.

## Handoff To Phase 5.1

Phase 5 should leave Phase 5.1 with:

- a stable `JournalListEntry` view model
- a journal list query and hook
- reusable filter and sort helpers
- entry navigation back to Title Details
- verified mutation invalidation for create, update, and delete flows

Phase 5.1 can then build the Calendar view on top of those foundations without reworking the Timeline data model.
