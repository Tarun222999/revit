# Environment Configuration

## Purpose

This document explains the environment variables used by the mobile app and where secrets should live.

The app is built with Expo, so variables prefixed with `EXPO_PUBLIC_` are available to the client bundle. Treat them as public values.

## Local Setup

Create a local `.env` file from `.env.example` when real service credentials are available.

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

The `.env` file is intentionally ignored by git.

## Required Variables

### `EXPO_PUBLIC_SUPABASE_URL`

The public project URL for the Supabase project.

Example shape:

```text
https://your-project-ref.supabase.co
```

### `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The public anonymous key for the Supabase project.

This key is safe to use in the mobile client only when Row Level Security policies are configured correctly.

## What Must Not Go In The Mobile App

Do not put these values in `EXPO_PUBLIC_*` variables:

- Supabase service role key
- TMDB API key
- future IGDB credentials
- private webhook secrets
- admin-only credentials

Private credentials belong in Supabase Edge Functions or other server-side environments.

## Current Phase 0 Status

During Phase 0, real Supabase values are optional.

The app can boot without them because the Supabase client wiring is only being prepared. Real values become necessary before implementing Phase 1 auth flows and database-backed profile creation.

## Supabase Project Timing

Create the Supabase project before Phase 1 auth implementation.

At that point, configure:

- Supabase Auth providers
- Postgres migrations
- Row Level Security policies
- Storage bucket for avatars
- local `.env` values

## Safety Rule

If a value can grant privileged access or bypass RLS, it must never be bundled into the mobile app.
