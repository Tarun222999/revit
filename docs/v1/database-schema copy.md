# Database Schema

## Purpose

This document defines the planned database model for the v1 app.

Goals:

- support the journal-first product cleanly
- stay simple enough for v1
- remain extensible for games and future social features
- fit Supabase Postgres and RLS well

## Database Strategy

Use:

- `Supabase Postgres`
- `SQL migrations`
- generated `TypeScript` types

Principles:

- user-owned data should be clearly separable via `user_id`
- external media metadata should be normalized before insertion
- schema should support mixed-media lists
- games can be added later without breaking the model

## Core Entities

The main v1 entities are:

- `profiles`
- `media_items`
- `journal_entries`
- `lists`
- `list_items`

Optional later support tables:

- `media_search_cache`
- `account_identities_view` or auth-derived read models if needed later

## Table Overview

Only these tables are required for the first implementation:

- `profiles`
- `media_items`
- `journal_entries`
- `lists`
- `list_items`

`media_search_cache` is not required for v1. It is only a possible later optimization if external search traffic or response shaping starts becoming repetitive.

### 1. `profiles`

Purpose:

- stores app-level user profile data linked to Supabase Auth users

Suggested columns:

- `id uuid primary key`
  - references `auth.users.id`
- `username text unique not null`
- `display_name text not null`
- `avatar_path text null`
- `bio text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- `avatar_path` should point to a Supabase Storage path
- `bio` should exist in v1 as an optional profile field

### 2. `media_items`

Purpose:

- stores normalized external title metadata used by the app
- acts as a stable internal reference for titles

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `source text not null`
- `source_id text not null`
- `media_type text not null`
- `title text not null`
- `original_title text null`
- `description text null`
- `release_date date null`
- `image_url text null`
- `backdrop_url text null`
- `genres jsonb not null default '[]'::jsonb`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- unique on `(source, source_id)`

Expected values:

- `source`: `tmdb`, later `igdb`
- `media_type`: `movie`, `series`, `anime`, later `game`

Why `metadata jsonb` exists:

- stores source-specific fields without polluting the main schema
- examples: runtime, seasons, network, studio

### 3. `journal_entries`

Purpose:

- the heart of the product
- links a user to a media item with personal journal state

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
  - references `profiles.id`
- `media_item_id uuid not null`
  - references `media_items.id`
- `status text not null`
- `rating numeric(2,1) null`
- `review_headline text null`
- `review_body text null`
- `contains_spoilers boolean not null default false`
- `started_on date null`
- `completed_on date null`
- `last_activity_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- unique on `(user_id, media_item_id)`

Expected status values:

- `planned`
- `in_progress`
- `completed`
- `dropped`

Notes:

- review fields can live in this table for v1 to keep things simple
- if social reviews become a bigger feature later, reviews can be separated into a dedicated table
- `review_headline` is optional in v1
- `rating` should use a `0.5 to 5.0` scale
- `completed_on` should be visible in the v1 UI
- `started_on` can remain in the schema for future use, but it does not need to be shown in the first UI pass

### 4. `lists`

Purpose:

- user-created mixed-media collections

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null`
  - references `profiles.id`
- `name text not null`
- `description text null`
- `is_default boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- unique on `(user_id, name)`

Notes:

- lists are mixed-media by default
- `is_default` can support system-created starter lists later

### 5. `list_items`

Purpose:

- connects media items into user lists

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `list_id uuid not null`
  - references `lists.id`
- `media_item_id uuid not null`
  - references `media_items.id`
- `position integer null`
- `note text null`
- `created_at timestamptz not null default now()`

Constraints:

- unique on `(list_id, media_item_id)`

Notes:

- `position` can support manual ordering later
- `note` can exist in v1 since it adds little complexity and gives future flexibility

## Relationships

```text
auth.users
  -> profiles

profiles
  -> journal_entries
  -> lists

media_items
  -> journal_entries
  -> list_items

lists
  -> list_items
```

## Why This Schema Works

### Journal-first

`journal_entries` is the center of the app and directly stores:

- status
- rating
- short review
- spoiler flag
- activity dates

### Mixed-media lists

Lists connect to `media_items`, not to media-type-specific tables, so a list can contain:

- a movie
- a series
- an anime
- later a game

### Extensible for games

Games can be added later by inserting `media_items` with:

- `source = igdb`
- `media_type = game`

No major schema rewrite is needed.

## RLS Strategy

### Private user-owned tables

Enable RLS on:

- `profiles`
- `journal_entries`
- `lists`
- `list_items`

Basic rule shape:

- users can read/update their own profile
- users can manage only their own journal entries
- users can manage only their own lists and list items

### Shared metadata table

`media_items` can be readable by authenticated users.

Write access should be restricted.

Recommended approach:

- clients can read `media_items`
- inserts/updates happen through trusted server-side flows or controlled policies
- Edge Functions can create/cache media records

## Suggested RLS Ownership Logic

### `profiles`

- select own profile
- update own profile
- insert own profile during onboarding

### `journal_entries`

- select rows where `user_id = auth.uid()`
- insert rows where `user_id = auth.uid()`
- update rows where `user_id = auth.uid()`
- delete rows where `user_id = auth.uid()`

### `lists`

- select rows where `user_id = auth.uid()`
- insert rows where `user_id = auth.uid()`
- update rows where `user_id = auth.uid()`
- delete rows where `user_id = auth.uid()`

### `list_items`

Policy should ensure users can only manage items for lists they own.

## Calendar Support

The Journal screen will support:

- Timeline
- Calendar

To support meaningful calendar views, `journal_entries` should include:

- `created_at`
- `updated_at`
- `last_activity_at`
- optional `started_on`
- `completed_on`

This allows us to show:

- when an item was added
- when progress changed
- when it was completed

For the first UI pass, `created_at`, `last_activity_at`, and `completed_on` are enough. `started_on` can remain available for later enhancement.

For v1 calendar behavior, activity should be based on `entry created`.

If later we want richer diary/history support, we can add:

- `journal_events`

But that is not required in v1.

## Future Tables For Later

These are intentionally not required in v1:

### `media_search_cache`

Purpose:

- optional app-level cache for external search queries
- not a Supabase built-in cache

Could store:

- search query
- provider/source
- normalized result references
- cached timestamp
- expiry timestamp

Why defer it:

- `media_items` is enough for the initial implementation
- search caching is an optimization, not a launch requirement
- adding it too early increases complexity without enough payoff

Recommended v1 approach instead:

- search through an Edge Function
- normalize the result
- upsert useful titles into `media_items`
- add dedicated search caching later only if needed

### `journal_events`

Purpose:

- detailed audit/activity history for calendar and feed experiences

Could store:

- entry created
- status changed
- review updated
- rating changed

### `reviews`

Purpose:

- separate review publishing from journal entries

Not needed in v1 because short reviews can live inside `journal_entries`.

### `follows`

Purpose:

- social graph for public profiles and feed

### `likes`

Purpose:

- engagement on reviews or lists

## Recommended Enums or Check Constraints

We can use either Postgres enums or check constraints.

Suggested controlled fields:

- `journal_entries.status`
- `media_items.media_type`
- `media_items.source`

For flexibility in Supabase migrations, check constraints may be simpler early on.

## Example Values

### `media_items.media_type`

- `movie`
- `series`
- `anime`
- `game`

### `media_items.source`

- `tmdb`
- `igdb`

### `journal_entries.status`

- `planned`
- `in_progress`
- `completed`
- `dropped`

## Suggested Indexes

These are likely useful:

- `media_items (source, source_id)` unique
- `journal_entries (user_id, updated_at desc)`
- `journal_entries (user_id, status)`
- `journal_entries (user_id, media_item_id)` unique
- `lists (user_id, created_at desc)`
- `list_items (list_id, position)`

## V1 Simplicity Decisions

To keep v1 manageable:

- keep reviews inside `journal_entries`
- keep lists mixed-media
- keep one journal entry per user per media item
- keep metadata normalized into one `media_items` table
- keep `bio` in `profiles` as an optional field
- keep `review_headline` optional
- use a `0.5 to 5.0` rating scale
- show `completed_on` in the UI before exposing `started_on`
- allow `list_items.note` in v1
- defer event history and social tables

## Decisions Confirmed

These decisions have been reviewed and accepted for the current plan:

1. `bio` should exist in `profiles` for v1.
2. `review_headline` should be optional.
3. `rating` should use `0.5 to 5`.
4. `completed_on` should be visible in v1 UI, while `started_on` can remain stored for future use.
5. `list_items.note` can exist in v1.
