# Phase 2 Core Media Integration

## Purpose

This document expands the Phase 2 section from `docs/feature-plan.md` into a concrete implementation plan.

Phase 2 establishes the trusted media data boundary for the app. Its job is to connect to TMDB through Supabase Edge Functions, normalize external responses into app-owned media shapes, and define how searched or viewed titles become stable `media_items` records.

This phase should make media search and title details technically possible without building the full Phase 3 discovery UI or Phase 4 journal entry flow yet.

## Phase Goal

Implement Core Media Integration.

By the end of Phase 2:

- TMDB credentials should live only in Supabase Edge Function secrets.
- the mobile client should call Supabase Edge Functions, not TMDB directly.
- Edge Functions should support media search.
- Edge Functions should support title details.
- TMDB movie, TV, and anime results should be normalized into one internal media shape.
- the app should have shared TypeScript media types for normalized titles.
- the app should have client API helpers and TanStack Query hooks for media search and details.
- useful searched or viewed titles should be persisted/upserted into `media_items`.
- `media_items` schema, RLS, and generated database types should be updated.

## Non-Goals

Do not build unrelated product features in Phase 2.

Specifically, do not implement:

- Discover rails as final UI
- full Search screen polish
- Title Details final visual design
- journal entry creation or editing
- Add/Edit Journal Entry modal behavior
- lists or list item flows
- profile stats
- recommendations
- IGDB integration
- client-side calls to TMDB

Small placeholder wiring in Search and Title Details is acceptable only to prove the media API flow works.

## Current Starting Point From Phase 1

Phase 1 left the app in this state:

- Supabase project is connected through local `.env`.
- Supabase Auth is wired through Email OTP / magic link, Google, and native iOS Apple code.
- `profiles` table exists with RLS.
- generated Supabase types exist in `lib/supabase/types.ts`.
- route guard sends users through Welcome, Onboarding, and app tabs based on session/profile state.
- app tabs are Home, Search, Journal, and Lists.
- Profile is reachable from the top-right avatar action.
- `features/discovery/components/SearchScreen.tsx` is still a placeholder.
- `features/media/components/TitleDetailsScreen.tsx` is still a placeholder.
- `lib/media/README.md` already defines media normalization as the owner of shared provider glue.
- `supabase/functions/README.md` already reserves Edge Functions for trusted TMDB proxying.

Known production auth blockers remain tracked in:

```text
docs/release-blockers.md
```

## Locked Product And Technical Direction

Phase 2 must follow the locked stack:

- Expo
- React Native
- TypeScript
- Supabase Edge Functions
- Supabase Postgres
- SQL migrations
- generated database types
- TanStack Query
- TMDB for movies, series, and anime

Phase 2 must follow the locked integration rule:

- do not call third-party content APIs directly from the production client
- normalize external API data in one place
- keep screens thin

## Media Scope

Supported in v1:

- movies from TMDB movie endpoints
- series from TMDB TV endpoints
- anime through TMDB TV/search data using a normalized `anime` media type where the result can be confidently classified

Deferred:

- games through IGDB
- game-specific discovery
- social recommendations
- separate anime-specific providers

## Environment And Secret Strategy

### Mobile App Variables

The Expo client should continue to use only:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not add `EXPO_PUBLIC_TMDB_*` variables.

### Edge Function Secrets

TMDB credentials should be configured as Supabase function secrets.

Recommended secret:

```text
TMDB_ACCESS_TOKEN=
```

Use a TMDB v4 access token where possible, sent as:

```text
Authorization: Bearer <token>
```

Do not commit TMDB credentials to `.env`, `.env.example`, migrations, or source files.

## Database Work

Add the `media_items` table from `docs/database-schema.md`.

Recommended columns:

```text
id uuid primary key default gen_random_uuid()
source text not null
source_id text not null
media_type text not null
title text not null
original_title text null
description text null
release_date date null
image_url text null
backdrop_url text null
genres jsonb not null default '[]'::jsonb
metadata jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Required constraints:

- unique on `(source, source_id)`
- `source` check allowing `tmdb` now and `igdb` later
- `media_type` check allowing `movie`, `series`, `anime`, and `game`

Recommended RLS:

- authenticated users can select `media_items`
- client writes should not be broadly allowed
- inserts and updates should happen through Edge Functions or controlled server-side flows

Use the least privileged write approach that works with Supabase Edge Functions. If the function needs elevated writes, use service role only in the function runtime and never in the mobile app.

## Normalized Media Model

Create a shared app media type under `lib/media`.

Recommended file:

```text
lib/media/types.ts
```

Recommended shape:

```ts
export type MediaSource = 'tmdb' | 'igdb';

export type MediaType = 'movie' | 'series' | 'anime' | 'game';

export type NormalizedMediaItem = {
  id?: string;
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  releaseDate?: string | null;
  year?: string | null;
  imageUrl?: string | null;
  backdropUrl?: string | null;
  genres: string[];
  metadata: Record<string, unknown>;
};
```

UI code should consume this shape or narrower view models derived from it. Raw TMDB response fields should stay inside function handlers or mapper files.

## TMDB Normalization Rules

TMDB movie results should normalize to:

- `source = tmdb`
- `sourceId = movie:<tmdb_id>`
- `mediaType = movie`
- `title = title`
- `originalTitle = original_title`
- `releaseDate = release_date`

TMDB TV results should normalize to:

- `source = tmdb`
- `sourceId = tv:<tmdb_id>`
- `mediaType = series` or `anime`
- `title = name`
- `originalTitle = original_name`
- `releaseDate = first_air_date`

Anime classification for Phase 2 should be conservative. Treat a TV result as `anime` only when TMDB genres, origin country, original language, keywords, or endpoint strategy provides enough signal. Otherwise keep it as `series`.

Store provider-specific details in `metadata`, such as:

- TMDB numeric id
- raw media category
- popularity
- vote average
- runtime or episode runtime
- season count
- network names
- studio or production company names
- original language
- origin country

## Edge Function Shape

Prefer a small number of focused functions over one vague catch-all.

Recommended initial functions:

```text
supabase/functions/media-search/index.ts
supabase/functions/media-details/index.ts
supabase/functions/_shared/tmdb.ts
supabase/functions/_shared/media-normalizers.ts
supabase/functions/_shared/cors.ts
```

### `media-search`

Purpose:

- receive a query and optional media type filter
- call TMDB search endpoints
- normalize results
- optionally upsert returned titles into `media_items`
- return normalized results to the client

Input:

```json
{
  "query": "arrival",
  "mediaType": "all",
  "page": 1
}
```

Allowed `mediaType` values:

- `all`
- `movie`
- `series`
- `anime`

Output:

```json
{
  "results": [],
  "page": 1,
  "totalPages": 1
}
```

### `media-details`

Purpose:

- receive a normalized source/sourceId pair or internal media item id
- load known DB data when available
- call TMDB details endpoints when needed
- normalize details
- upsert the title into `media_items`
- return the normalized detail object

Input option A:

```json
{
  "source": "tmdb",
  "sourceId": "movie:123"
}
```

Input option B:

```json
{
  "mediaItemId": "uuid"
}
```

Output:

```json
{
  "item": {}
}
```

## App Client Integration

Create feature-owned API and hooks without making screens do data work.

Recommended files:

```text
features/media/api/media-api.ts
features/media/hooks/useMediaDetails.ts
features/discovery/api/search-api.ts
features/discovery/hooks/useSearchTitles.ts
lib/media/types.ts
```

The app client should call:

```ts
supabase.functions.invoke('media-search', { body })
supabase.functions.invoke('media-details', { body })
```

Use TanStack Query for:

- search query caching keyed by query/filter/page
- details query caching keyed by source/sourceId or media item id
- clear loading, empty, and error states

## Route And Screen Wiring

Phase 2 can lightly wire placeholders for verification.

Search route:

- keep `app/(tabs)/search.tsx` thin
- render `SearchScreen`
- `SearchScreen` can contain a basic input and list if needed to verify search
- full Phase 3 visual polish waits until Phase 3

Title details route:

- keep `app/title/[id].tsx` thin
- decide whether `[id]` initially represents an internal `media_items.id` or an encoded `source/sourceId`
- prefer internal `media_items.id` after upsert when possible
- full Phase 4 title details UI waits until Phase 4

## Persistence Strategy

Use `media_items` as the stable app reference for journal and list records.

Phase 2 should decide and implement one initial strategy:

1. Upsert search results immediately.
2. Upsert only when opening details.

Recommended starting choice:

- upsert when opening details
- optionally upsert top search results only if it simplifies navigation

This keeps the database cleaner while still creating a stable record before journal/list features need one.

## Expected Files

Likely new files:

```text
docs/phase-2-core-media-integration.md
supabase/migrations/<timestamp>_create_media_items.sql
supabase/functions/media-search/index.ts
supabase/functions/media-details/index.ts
supabase/functions/_shared/tmdb.ts
supabase/functions/_shared/media-normalizers.ts
supabase/functions/_shared/cors.ts
lib/media/types.ts
features/media/api/media-api.ts
features/media/hooks/useMediaDetails.ts
features/discovery/api/search-api.ts
features/discovery/hooks/useSearchTitles.ts
```

Likely updated files:

```text
lib/supabase/types.ts
docs/environment.md
.env.example
features/discovery/components/SearchScreen.tsx
features/media/components/TitleDetailsScreen.tsx
```

Only update `.env.example` with non-secret public values or documentation comments if needed. Do not add TMDB secrets there.

## Implementation Sequence

### 1. Confirm TMDB Secret Strategy

Expected outcome:

- TMDB token is available to Supabase Edge Functions as a secret.
- docs clearly state that TMDB credentials never enter Expo public env.

### 2. Add `media_items` Migration And RLS

Expected outcome:

- table exists
- constraints and indexes exist
- authenticated reads work
- client writes are restricted
- trusted function write path is documented

### 3. Regenerate Supabase Types

Expected outcome:

- `lib/supabase/types.ts` includes `media_items`
- app API helpers use generated table types where useful

### 4. Define Shared Media Types

Expected outcome:

- app has a normalized media contract
- UI and hooks do not import raw TMDB types

### 5. Build TMDB Shared Function Utilities

Expected outcome:

- TMDB fetch helper handles auth headers and failed responses
- CORS helper handles preflight
- normalizers map TMDB movie and TV shapes into app media shapes

### 6. Build `media-search` Function

Expected outcome:

- function validates query input
- supports all/movie/series/anime filters
- returns normalized search results
- handles empty queries and TMDB errors calmly

### 7. Build `media-details` Function

Expected outcome:

- function validates identifiers
- fetches TMDB details
- returns normalized details
- upserts or returns a matching `media_items` row

### 8. Add App API Helpers And Hooks

Expected outcome:

- Search and details calls go through Supabase Functions
- TanStack Query owns loading/error/caching state
- screens remain thin

### 9. Lightly Wire Search And Details Verification

Expected outcome:

- authenticated user can run a search from the app
- tapping or selecting a result can load details through the details function
- placeholder UI remains acceptable until Phase 3 and Phase 4

### 10. Verify The Phase

Expected outcome:

- `npm run check` passes
- `npm run export:web` passes
- Edge Functions can be served locally or deployed and invoked
- no client file calls TMDB directly

## Acceptance Criteria

Phase 2 is complete when:

1. `media_items` exists with constraints, indexes, RLS, and generated TypeScript types.
2. TMDB credentials are configured only as Supabase Edge Function secrets.
3. No Expo public env variable contains TMDB credentials.
4. No client code calls TMDB directly.
5. `media-search` validates input and returns normalized media results.
6. `media-details` validates input and returns a normalized media detail.
7. Movie, series, and conservative anime normalization are implemented.
8. Shared app media types exist in `lib/media`.
9. Search and details app API helpers call Supabase Edge Functions.
10. TanStack Query hooks exist for search and details.
11. Search and details placeholders can verify the full app-to-function flow.
12. Useful opened titles are upserted into `media_items`.
13. Errors, loading states, and empty states are represented at the hook or screen boundary.
14. `npm run check` passes.
15. `npm run export:web` passes or any limitation is documented.

## Verification Checklist

### Automated

Run:

```text
npm run typecheck
npm run lint
npm run doctor
npm run check
npm run export:web
```

### Database

Verify:

- `media_items` table exists
- `(source, source_id)` uniqueness works
- media type/source constraints reject invalid values
- authenticated users can select media items
- normal app clients cannot broadly insert or update media items
- function write path can upsert media items

### Edge Functions

Verify:

- `media-search` rejects missing or too-short queries
- `media-search` returns normalized movie results
- `media-search` returns normalized series results
- anime filter returns only conservatively classified anime results
- `media-details` returns details for a TMDB movie source id
- `media-details` returns details for a TMDB TV source id
- function responses do not leak secrets
- TMDB API failures return safe error messages

### App

Verify:

- search hook calls Supabase Function
- details hook calls Supabase Function
- loading state is visible
- empty state is visible
- error state is visible
- no screen imports raw TMDB types
- no client code contains `api.themoviedb.org`

## Risks And Decisions To Watch

### Anime Classification

TMDB does not have a perfect anime boundary.

Decision:

- classify anime conservatively in Phase 2
- avoid overpromising anime coverage in UI copy
- keep the normalization easy to refine later

### Search Result Persistence

Upserting every search result can create noisy database rows.

Decision:

- prefer upserting details views first
- revisit search-result upserts only if navigation or journal flow needs it

### Function Authorization

Search and details should be available only to authenticated app users unless there is a clear product reason to allow public calls.

Decision:

- require a valid Supabase user token for app media functions
- keep service role use server-side only if needed for controlled `media_items` writes

### Rate Limits And Caching

TMDB rate limits and repeated searches can become a concern.

Decision:

- do not build a full `media_search_cache` table in Phase 2
- rely on TanStack Query client caching first
- use `media_items` as stable title persistence
- add server-side caching later only when usage justifies it

## Handoff To Phase 3

Phase 3 should begin after the app can search and load normalized media through Supabase Edge Functions.

Phase 3 can then build:

- Discover shell
- Search screen UI
- media type filters
- trending and content rails
- stronger empty/loading/error presentation

Phase 2 should leave Phase 3 with a reliable media API surface and no direct TMDB client calls.
