# Locked Stack Decisions

## Purpose

This document locks the technical direction for the v1 release of the app so future planning and implementation stay consistent.

The goal is to build a `production-ready`, `journal-first`, `portfolio-quality` React Native app with enough flexibility to grow later.

## Product Summary

The app is a personal entertainment journal where users can:

- Search titles
- Add titles to their journal
- Track status
- Rate titles
- Write short reviews
- Organize titles into mixed-media lists

Supported media focus for launch:

- Movies
- Series
- Anime

Games should be supported by the data model from day one, but the actual game integration is deferred to `v1.1`.

## Locked Decisions

### 1. App Framework

Use:

- `Expo`
- `React Native`
- `TypeScript`

Why:

- Best speed for development
- Good production path for iOS and Android
- Strong ecosystem
- Good fit for a showcase app

## 2. Backend

Use:

- `Supabase Auth`
- `Supabase Postgres`
- `Supabase Storage`
- `Supabase Edge Functions`

Why:

- One backend provider keeps complexity low
- Works well with React Native
- Edge Functions can safely proxy third-party APIs
- Postgres fits the journal/list/review data model very well

## 3. Authentication

Use:

- `Google login`
- `Sign in with Apple` on iOS
- `Email OTP / Magic Link`

Do not use in v1:

- Email/password as the main auth flow

Why:

- Cleaner UX
- Better for mobile
- Production-friendly
- Supports Apple review expectations more safely when Google login exists on iOS

Important note:

- Account deletion must be supported inside the app for production readiness

## 4. External Content APIs

### Launch APIs

Use:

- `TMDB` for movies
- `TMDB` for series
- `TMDB` for anime

### Deferred API

Use later in `v1.1`:

- `IGDB` for games

Why games are deferred:

- Adds a second external integration
- Adds a second normalization path
- Slows the first shippable version

Why TMDB for anime:

- Anime-specific APIs have more legal/product risk for this app concept
- TMDB is a safer launch choice even if coverage is less perfect

## 5. API Integration Strategy

Do not call external APIs directly from the mobile app in production.

Use:

- `Supabase Edge Functions` as the integration layer

Responsibilities:

- Hide API keys
- Call TMDB
- Normalize response shapes
- Support caching later
- Enforce rate-limit protection if needed

## 6. Database Strategy

Use:

- `Supabase Postgres`
- `SQL migrations`
- Generated `TypeScript` database types

Do not use in v1:

- ORM

Why:

- Simpler stack
- Lower abstraction
- Faster to build
- Good enough for the current level of backend complexity

## 7. Styling

Use:

- `NativeWind`

Why:

- Fast UI iteration
- Good developer experience
- Easy to build consistent utility-driven styling
- Good fit for a design-heavy showcase app

Important note:

- We should still define our own design tokens, spacing, colors, type scale, and reusable app components

## 8. Navigation

Use:

- `Expo Router`

Why:

- Strong Expo integration
- File-based routing is easy to scale
- Good fit for tabs, stacks, and modal routes

## 9. Data Fetching and State

Use:

- `TanStack Query` for server state
- Local component state for simple UI state

Avoid in v1 unless needed:

- Large global client-state libraries for everything

Why:

- Most complexity is server-driven
- Query caching and mutation flows are a good match for this app

## 10. Component Strategy

Primary approach:

- Build a `small custom component layer`

Examples:

- Button
- Input
- Card
- Chip
- Rating control
- Section header
- Empty state

Optional helper library:

- `React Native Paper` for selective utility components only

Examples of acceptable selective use:

- Dialogs
- Menus
- Text inputs if needed
- Helper primitives

Do not do:

- Let a component library define the whole visual identity of the app

## 11. UX Decisions

Use:

- `0.5 to 5.0` rating scale
- `slider-based rating input` for v1
- optional `review_headline` with max `80` characters
- `review_body` with a short-form limit in the `300 to 500` character range

Calendar behavior for v1:

- calendar activity should be based on `entry created`

Navigation and account behavior for v1:

- Discover is the browsing-focused home surface.
- Do not add a separate dashboard or Home tab.
- The avatar action opens the profile/account surface.
- Profile/account owns identity, avatar, legal/support, sign out, and account deletion.
- Do not build a standalone profile taste summary dashboard in v1.

Notes:

- we can evaluate alternative rating inputs later
- formal A/B testing is not required before the first implementation
- completion dates can still be stored and shown where relevant without driving calendar activity in v1

## Must-Use

- Expo
- React Native
- TypeScript
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Edge Functions
- TMDB
- NativeWind
- Expo Router
- TanStack Query
- SQL migrations
- Generated TypeScript DB types

## Optional

- React Native Paper for a few utility components
- Light caching layer for external metadata
- Analytics
- Crash reporting

## Defer To V1.1

- IGDB integration for games
- Game-specific discovery
- Public profiles
- Social features
- Comments and likes
- Recommendations
- Long-form reviews

## Avoid In V1

- Multiple backend vendors for core auth/data
- ORM
- Full Material-style component-library-driven UI
- Password-heavy auth flow
- Direct external API calls from the mobile app
- Overbuilding offline sync

## Final Locked V1 Stack

- `Expo`
- `React Native`
- `TypeScript`
- `Supabase Auth`
- `Supabase Postgres`
- `Supabase Storage`
- `Supabase Edge Functions`
- `TMDB` for movies, series, and anime
- `NativeWind`
- `Expo Router`
- `TanStack Query`
- `SQL migrations`
- `Generated TypeScript database types`

## Final Launch Scope

Launch with:

- Movies
- Series
- Anime

Prepare architecture for:

- Games later via IGDB

## Implementation Principle

The app should be:

- Small but complete
- Polished enough for App Store / Play Store
- Easy to extend later
- Legally and operationally safer than a rushed all-in-one build
