# AGENTS.md

## Purpose

This file is the first-stop instruction file for any agent working in this repository.

Before making product, architecture, or code decisions, read the project docs listed below and follow them unless the user explicitly asks to change course.

## Active Version

Active development is now `v1.1`.

- `docs/v1/` is the approved v1 baseline and historical record.
- `docs/v1.1/` is the active location for v1.1 proposals, decisions, phase plans, and implementation notes.
- Do not edit v1 documents to describe v1.1 behavior unless the user explicitly asks to revise the historical baseline.
- A v1.1 document marked `Draft`, `Proposal`, or `Implementation: Not approved` is review material only and does not authorize implementation.
- After the user approves a v1.1 proposal, update its status before treating it as an active product decision.

## Read These Files First

1. `docs/v1.1/journal-refinement.md`
2. `docs/v1/STACK_DECISIONS.md`
3. `docs/v1/version1features.md`
4. `docs/v1/react-native-guidelines.md`
5. `docs/v1/folder-structure.md`
6. `docs/v1/database-schema.md`
7. `docs/v1/feature-plan.md`

Read the v1 documents as the implemented baseline. Apply only those v1.1 changes whose document status shows that they have been approved.

## Additional Review Mode

If the task is code review, PR review, or implementation review, also read:

- `docs/v1/reviewer-agent.md`

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

Games via `IGDB` were deferred from v1. Entering v1.1 does not automatically put games into the active implementation scope. Do not add IGDB or game-specific product surfaces until the user approves a dedicated v1.1 plan for them. Keep the architecture extensible in the meantime.

## Product Rules

The approved v1 product remains the baseline:

- Discover is the browsing-focused home surface; do not add a separate dashboard without an approved v1.1 decision
- Journal currently uses `Timeline` and `Calendar`
- Lists are mixed-media by default
- Profile / Account is focused on identity, account, legal, and support rather than a taste dashboard
- Journal is management-focused
- Reviews are short-form
- Add/Edit Journal Entry is a modal flow

The approved v1.1 Journal product direction is documented in `docs/v1.1/journal-refinement.md` and overrides conflicting v1 Journal behavior. Do not implement its `Timeline | Planner | Calendar` model, rewatch history, or schema changes until the user approves a separate v1.1 implementation phase with an ordered implementation sequence.

## Engineering Rules

- Keep screens thin
- Prefer feature-based organization
- Normalize external API data in one place
- Do not call third-party content APIs directly from the client in production
- Prefer simple maintainable solutions over premature abstraction
- Do not introduce an ORM unless an approved stack decision explicitly changes course
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
2. check the status of the relevant v1.1 proposal or phase document
3. align the task with the approved v1.1 decisions and the v1 baseline
4. avoid introducing conflicting patterns
5. keep new version-specific planning and decision documents under `docs/v1.1/`

## Phase Implementation Rule

When a phase document includes an `Implementation Sequence`, work through it strictly one step at a time.

- Do not start coding or planning later implementation-sequence steps until the user explicitly says to proceed to that step.
- After completing or discussing a step, stop and wait for the user's approval before moving on.
- If a later step seems technically related, mention it as a future step instead of implementing it early.
- This rule applies to v1.1 and every future phase.

## Decision Precedence

When instructions conflict, use this order:

1. the latest explicit user instruction
2. approved v1.1 decision and phase documents
3. the approved v1 baseline documents
4. current implementation behavior as evidence of what exists, not as product authority

Draft v1.1 documents do not override the v1 baseline until the user approves them.

## If A Decision Seems To Conflict

If current code, older notes, or a new request conflicts with the locked docs:

- use the decision precedence above
- if the change has large product or architecture impact, call it out clearly

## Goal

The goal is not just to make code run.

The goal is to keep this codebase:

- production-ready
- readable
- scalable enough for future features
- visually intentional
- easy for future agents and contributors to continue
