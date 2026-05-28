# Phase 3 Discovery And Search

## Purpose

This document expands Phase 3 from `docs/feature-plan.md` into a concrete implementation plan for the Home Discover/Dashboard shell and the Search experience.

Phase 3 should turn the Phase 2 media API verification wiring into a usable browsing surface. It should make search feel intentional, add media-type filters, introduce a structured Home screen, and improve loading, empty, and error states without starting journal CRUD.

## Phase Goal

Implement Discovery and Search.

By the end of Phase 3:

- Home should have the locked Discover and Dashboard segmented structure.
- Discover should become a real browsing surface with mode-driven media rails.
- Dashboard should exist as a useful shell for later personal data without querying journal data yet.
- Search should have polished input, media filters, result cards, and state handling.
- Search result taps should continue to route through the existing title details flow.
- All media data should still come through Supabase Edge Functions.
- No client-side TMDB calls should be introduced.

## Non-Goals

Do not implement unrelated product work in Phase 3.

Specifically, do not implement:

- journal entry CRUD
- Add/Edit Journal Entry modal behavior
- journal timeline or calendar queries
- lists CRUD
- profile stats
- personalized dashboard data from journal entries
- IGDB game integration
- client-side TMDB calls

Small dashboard placeholders are acceptable only to preserve the final Home structure before Phase 7 connects personal data.

## Current Starting Point From Phase 2

Phase 2 left the app in this state:

- `media_items` exists in Supabase with generated app types.
- TMDB credentials live in Supabase Edge Function secrets.
- `media-search` and `media-details` Edge Functions are deployed.
- App API helpers and TanStack Query hooks exist for search and details.
- Search screen can call `media-search`.
- Title Details screen can call `media-details`.
- Details flow upserts opened TMDB titles into `media_items`.
- Search and title details UI are intentionally minimal verification wiring.
- There are no direct TMDB client calls.

## Locked Product And Technical Direction

Phase 3 must follow the locked stack:

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind
- TanStack Query
- Supabase Edge Functions
- TMDB through server-side functions only

Phase 3 must follow the product rules:

- Home uses Discover and Dashboard.
- Search supports media-type filtering.
- Screens stay thin.
- Feature logic lives under `features/discovery`.
- Title Details remains the route for selected search results.
- Journal entry creation waits for Phase 4.

## Discovery Scope

Phase 3 should create a practical discovery shell without pretending to have a full recommendation system.

Target Discover structure:

- `Discover | Dashboard` segmented Home structure
- a clean v1 top section that introduces browsing without becoming an oversized hero
- stable discovery mode chips:
  - `Trending`
  - `New Releases`
  - `Top Rated`
- horizontal media rails:
  - Movies
  - Series
  - Anime
- a `See all` action on each rail
- poster cards that route to Title Details through the existing media route flow

The selected discovery mode should update all three rails. Rails must use real normalized data from Supabase Edge Functions, not fake local content.

Recommended rail card content:

- poster image
- title
- year when available
- media type badge

Mode chips are navigation controls and should stay in a stable order. Do not randomize their position. Users should be able to build muscle memory around `Trending`, `New Releases`, and `Top Rated`.

`Hidden Gems` is deferred for v1. It is a promising mode, but it needs a clear definition such as high rating, lower popularity, and a minimum vote count. Without that rule it can feel fake or arbitrary. Revisit it after the core discovery modes are stable and after server-side caching rules are in place.

Do not randomize the order of chips or main rail categories. If variety is needed later, rotate or refresh the content inside a rail using a server-owned rule rather than moving controls around in the UI.

### `See all` Behavior

`See all` should open a dedicated browse listing screen, not the query-first Search screen.

Recommended route shape:

```text
app/discover/[mode]/[mediaType].tsx
```

Examples:

```text
/discover/trending/movie
/discover/new_releases/series
/discover/top_rated/anime
```

The listing screen should show one focused browse collection:

```text
Trending Movies
New Releases Series
Top Rated Anime
```

Responsibilities:

- use the same `media-discover` Edge Function
- support pagination or a simple load-more path
- show a vertical list or grid of media cards
- route item taps to Title Details
- keep Search reserved for explicit title queries

This keeps the app model clear:

- Home Discover shows preview rails
- Discover Listing shows all items for one mode and media type
- Search handles typed user queries
- Title Details handles a selected media item

## Dashboard Scope

Dashboard should exist now because the Home product model requires it, but most useful data depends on journal CRUD from later phases.

Recommended Phase 3 dashboard content:

- quick actions that route to Search and Journal
- empty-state panels for In Progress, Recently Added, and Reviews
- copy that sets expectations without querying missing data

Do not create mock user stats that look real.

## Search Scope

Search should become the primary Phase 3 working surface.

Required behavior:

- supports query input
- supports filters: All, Movies, Series, Anime
- requires at least two characters before invoking the function
- shows loading, empty, and error states
- displays poster, title, year, media type, genres or metadata, and description when available
- routes selected results to `/title/[id]`

Optional behavior if simple:

- accept route params from Home quick prompts
- clear query/filter controls
- show a compact result count

## Component Structure

Keep `SearchScreen` and `HomeScreen` focused on composition.

Recommended files:

```text
app/discover/[mode]/[mediaType].tsx
features/discovery/components/HomeScreen.tsx
features/discovery/components/DiscoverListingScreen.tsx
features/discovery/components/SearchScreen.tsx
features/discovery/components/DiscoverScreen.tsx
features/discovery/components/DiscoverModeBar.tsx
features/discovery/components/DiscoverRail.tsx
features/discovery/components/DiscoverPosterCard.tsx
features/discovery/components/SearchResultCard.tsx
features/discovery/components/MediaFilterBar.tsx
features/discovery/api/discover-api.ts
features/discovery/hooks/useDiscoverRail.ts
```

Add more components only when they keep the screens easier to scan.

## Edge Function Boundary

Phase 3 should reuse Phase 2 APIs:

```text
features/discovery/api/search-api.ts
features/discovery/hooks/useSearchTitles.ts
features/media/api/media-api.ts
features/media/hooks/useMediaDetails.ts
```

Do not call TMDB directly from React Native.

Phase 3 should add a dedicated discovery function instead of overloading search:

```text
supabase/functions/media-discover/index.ts
```

Recommended input:

```json
{
  "mode": "trending",
  "mediaType": "movie",
  "page": 1
}
```

Recommended mode values:

```text
trending
new_releases
top_rated
```

Recommended media type values:

```text
movie
series
anime
```

Recommended output:

```json
{
  "results": [],
  "page": 1,
  "totalPages": 1,
  "cachedAt": "2026-05-26T00:00:00.000Z"
}
```

Phase 3 should make `media-details` cache-aware before Search UI polish is considered complete:

- when called with `source` and `sourceId`, first look for an existing `media_items` row by `(source, source_id)`
- if found, return the saved normalized row and skip TMDB
- if not found, fetch TMDB details, normalize, upsert, and return the saved row
- defer stale metadata refresh rules until a later caching or quality pass

This keeps repeated search-to-details flows from refetching TMDB details for titles the app has already saved.

For shared discovery rails like Trending, New Releases, and Top Rated, prefer server-side caching instead of calling TMDB on every app request. The results are not user-specific, so they can be cached per `(mode, mediaType, page)` key. A simple v1 cache can use a table or function-level caching strategy with a short TTL:

- Trending: refresh roughly every 1 to 6 hours
- New Releases: refresh roughly every 12 to 24 hours
- Top Rated: refresh roughly every 24 hours

Cache invalidation should be time-based for v1. Manual invalidation or richer freshness rules can wait until usage patterns justify them.

The app can still use TanStack Query caching on top of the server cache, but client caching should not be the only protection against repeated TMDB calls because these rails are shared across users.

## Implementation Sequence

### 1. Finalize Discover UX Contract

Expected outcome:

- Discover uses stable modes: `Trending`, `New Releases`, and `Top Rated`.
- Discover shows Movies, Series, and Anime rails.
- `Hidden Gems` remains documented as deferred.
- `See all` goes to a dedicated Discover Listing screen, not Search.
- Search remains dedicated to typed title queries.

### 2. Define Discovery API Types

Expected outcome:

- Add shared request/response types for discovery rails.
- Define allowed discovery modes:
  - `trending`
  - `new_releases`
  - `top_rated`
- Define allowed discovery media types:
  - `movie`
  - `series`
  - `anime`
- Keep the normalized media item shape shared with Phase 2 media APIs.

### 3. Add Server-Side Discovery Cache Strategy

Expected outcome:

- Decide the v1 cache storage approach for `media-discover`.
- Cache discovery responses by `(mode, mediaType, page)`.
- Use time-based invalidation.
- Suggested TTLs:
  - Trending: 1 to 6 hours
  - New Releases: 12 to 24 hours
  - Top Rated: 24 hours
- Do not add complex manual cache invalidation in Phase 3.

### 4. Build `media-discover` Edge Function

Expected outcome:

- Add `supabase/functions/media-discover/index.ts`.
- Validate request body.
- Fetch the right TMDB-backed data for the selected mode and media type.
- Normalize results using the shared media normalizers.
- Return paginated normalized results.
- Use the server-side cache when possible.
- Require authenticated requests, matching the Phase 2 media functions.
- Do not expose TMDB credentials to the client.

### 5. Harden `media-details` Cache Lookup

Expected outcome:

- When `media-details` receives `source` and `sourceId`, it first checks `media_items` by `(source, source_id)`.
- If found, it returns the existing normalized row and skips TMDB.
- If not found, it fetches TMDB details, normalizes, upserts, and returns the saved row.
- Stale metadata refresh rules remain deferred.

### 6. Add App Discovery API Helper And Hooks

Expected outcome:

- Add `features/discovery/api/discover-api.ts`.
- Add a TanStack Query hook such as `useDiscoverRail`.
- Query keys include mode, media type, and page.
- Client code calls Supabase Edge Functions only.
- Screens do not own fetch or response-normalization logic.

### 7. Build Discover UI Components

Expected outcome:

- Add focused discovery components, likely:
  - `DiscoverScreen`
  - `DiscoverModeBar`
  - `DiscoverRail`
  - `DiscoverPosterCard`
- Keep mode chip order stable.
- Keep rail order stable: Movies, Series, Anime.
- Show loading, empty, and error states per rail or for the screen in a calm, compact way.
- Poster cards route to Title Details.

### 8. Build Discover Listing Route

Expected outcome:

- Add route:

```text
app/discover/[mode]/[mediaType].tsx
```

- Add `DiscoverListingScreen`.
- Show a clear title such as `Trending Movies`, `New Releases Series`, or `Top Rated Anime`.
- Use `media-discover` with page support.
- Add load-more behavior if the function returns additional pages.
- Route selected items to Title Details.

### 9. Wire Home Discover And Dashboard Shell

Expected outcome:

- `HomeScreen` renders the locked `Discover | Dashboard` segmented structure.
- Discover uses the new browse rails.
- Dashboard remains a non-personalized shell until Phase 7.
- No journal CRUD or personalized dashboard data is introduced.

### 10. Polish Search Screen

Expected outcome:

- Search keeps the query-first model.
- Search supports All, Movies, Series, and Anime filters.
- Search result cards show poster, title, year, media type, and useful metadata.
- Search shows clear loading, empty, and error states.
- Search result taps continue to open Title Details through the existing route id flow.

### 11. Verify No Direct TMDB Client Calls

Expected outcome:

- No app/client file contains direct TMDB URLs or credentials.
- TMDB access remains isolated to Supabase Edge Functions.
- `.env` and `.env.example` do not introduce public TMDB variables.

### 12. Verify Phase 3

Expected outcome:

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run check` passes when environment permissions allow.
- Discover modes update all rails.
- `See all` opens the correct listing screen.
- Repeated discovery requests use cached server data before TTL expiry.
- Reopening an already saved media item by `source/sourceId` skips TMDB details fetch.
- Search still works for known movie, series, and anime queries.

## Acceptance Criteria

Phase 3 is complete when:

1. `docs/phase-3-discovery-search.md` exists.
2. Home renders a Discover/Dashboard segmented shell.
3. Discover supports Trending, New Releases, and Top Rated modes.
4. Discover shows Movies, Series, and Anime rails for the selected mode.
5. Hidden Gems is documented as deferred until a real ranking rule exists.
6. Discover mode chip order is stable and not randomized.
7. Discover rail category order is stable and not randomized.
8. Each Discover rail `See all` action opens a dedicated Discover Listing screen for the current mode and media type.
9. Discover Listing uses `media-discover` pagination or load-more behavior and does not depend on typed search queries.
10. Discover rails are served through `media-discover`, not direct TMDB client calls.
11. `media-discover` caches shared rail responses by `(mode, mediaType, page)` with time-based invalidation.
12. Dashboard is present but does not depend on journal CRUD.
13. Search UI is polished beyond Phase 2 verification wiring.
14. Search supports All, Movies, Series, and Anime filters.
15. Search shows loading, empty, error, and result states clearly.
16. Search result cards show poster artwork when available.
17. Search result taps still open Title Details through the existing media route id.
18. Opening a previously saved TMDB title by `source/sourceId` returns the existing `media_items` row instead of calling TMDB again.
19. No client code calls TMDB directly.
20. `npm run typecheck` passes.
21. `npm run lint` passes.
22. `npm run check` passes when environment permissions allow.

## Verification Checklist

Run:

```text
npm run typecheck
npm run lint
npm run check
```

Manual checks:

- Home opens on the Discover segment.
- Home can switch between Discover and Dashboard.
- Discover mode changes update Movies, Series, and Anime rails.
- Discover mode chips remain in the same order across reloads and mode changes.
- Discover rail categories remain Movies, Series, Anime in that order.
- `See all` on Trending Movies opens a Trending Movies listing screen.
- `See all` listings can load additional `media-discover` pages when available.
- Discover rails use cached server-side data where available.
- Repeated requests for the same `(mode, mediaType, page)` do not call TMDB until the cache TTL expires.
- Search does not call the function for one-character queries.
- Search shows results for a known movie query.
- Search filter changes refetch through `media-search`.
- Tapping a result opens Title Details.
- Reopening a previously saved result by `source/sourceId` skips a TMDB details fetch.
- No client file contains `api.themoviedb.org`.

## Handoff To Phase 4

Phase 4 should begin after Search and Title Details feel stable enough to support the journal loop.

Phase 4 can then build:

- final Title Details UI
- Add/Edit Journal Entry modal
- journal entry create/update/delete mutations
- status, rating, review, spoiler, and completed date handling

Phase 3 should leave Phase 4 with a reliable path from discovery/search into a specific normalized media item.
