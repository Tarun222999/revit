# AGENTS.md

## Purpose

This file is the first-stop instruction file for any agent working in this repository.

Before making product, architecture, or code decisions, read the project docs listed below and follow them unless the user explicitly asks to change course.

## Read These Files First

1. `docs/STACK_DECISIONS.md`
2. `docs/version1features.md`
3. `docs/react-native-guidelines.md`
4. `docs/folder-structure.md`
5. `docs/database-schema.md`
6. `docs/feature-plan.md`

## Additional Review Mode

If the task is code review, PR review, or implementation review, also read:

- `docs/reviewer-agent.md`

## Project Summary

This repository is for a `production-ready`, `journal-first` entertainment tracking app built for portfolio and App Store / Play Store release quality.

The app lets users:

- search titles
- add titles to a journal
- track status
- rate titles
- write short reviews
- organize titles into mixed-media lists

## Locked Stack

Unless the user explicitly changes the direction, use:

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

Games via `IGDB` are deferred to `v1.1`, but the architecture should remain extensible for them.

## Product Rules

Keep the product aligned with these decisions:

- Home uses `Discover` and `Dashboard`
- Journal uses `Timeline` and `Calendar`
- Lists are mixed-media by default
- Profile is summary-focused
- Journal is management-focused
- Reviews are short-form
- Add/Edit Journal Entry is a modal flow

## Engineering Rules

- Keep screens thin
- Prefer feature-based organization
- Normalize external API data in one place
- Do not call third-party content APIs directly from the client in production
- Prefer simple maintainable solutions over premature abstraction
- Do not introduce an ORM in v1
- Use generated database types and SQL migrations

## Auth Rules

Use:

- Google login
- Sign in with Apple on iOS
- Email OTP / magic link

Avoid making email/password the primary auth flow unless the user explicitly asks for that change.

## When Starting New Work

Before implementing major changes:

1. read the docs listed above
2. align the task with the locked product and stack decisions
3. avoid introducing conflicting patterns

## If A Decision Seems To Conflict

If current code, older notes, or a new request conflicts with the locked docs:

- prefer the latest explicit user instruction
- otherwise prefer the repo docs over assumptions
- if the change has large product or architecture impact, call it out clearly

## Goal

The goal is not just to make code run.

The goal is to keep this codebase:

- production-ready
- readable
- scalable enough for future features
- visually intentional
- easy for future agents and contributors to continue
