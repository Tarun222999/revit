# Feature Plan

## Purpose

This document outlines the development sequence for building the app to support the planned v1 feature set.

It is intentionally high level for now. More detailed implementation notes, acceptance criteria, and technical subtasks can be added later.

## Planning Principles

- Build the smallest complete vertical slices first
- Prioritize production readiness over surface area
- Keep the app usable at every major milestone
- Defer non-essential complexity until the core journal loop is solid

## V1 Goal

Ship a production-ready `journal-first` app that supports:

- authentication
- onboarding
- discovery/search
- title details
- journal entry creation and editing
- timeline and calendar journal views
- mixed-media lists
- profile summary
- settings and account management

## Development Phases

## Phase 0: Project Setup

Goal:

- establish the app foundation before feature development

Outline:

- initialize Expo React Native app with TypeScript
- set up Expo Router
- set up NativeWind
- set up TanStack Query
- configure Supabase client
- add environment configuration
- define initial app theme/tokens
- create base project folder structure
- add basic shared UI primitives

Deliverable:

- app boots successfully with routing, styling, and backend wiring ready

## Phase 1: Auth and App Shell

Goal:

- get users into the app with the production-ready auth flow

Outline:

- build Welcome / Auth screen
- add Google login
- add Apple login on iOS
- add Email OTP flow
- build onboarding / create profile screen
- create profile persistence in Supabase
- add auth session handling
- add protected routing between auth flow and app flow

Deliverable:

- user can create an account, complete onboarding, and land inside the app

## Phase 2: Core Media Integration

Goal:

- connect the app to external content data in a safe and normalized way

Outline:

- create Supabase Edge Function(s) for TMDB
- normalize TMDB response shape into internal media model
- support search endpoint flow
- support title details endpoint flow
- define `media_items` persistence strategy
- decide initial upsert behavior for titles

Deliverable:

- app can search titles and load details using normalized data

## Phase 3: Discovery and Search

Goal:

- make content browsing usable even before journaling is complete

Outline:

- build Home screen shell
- build Home segmented structure: Discover and Dashboard
- build Search screen
- add media type filters
- add trending/content rails
- add loading, empty, and error states

Deliverable:

- user can discover and search media content in the app

## Phase 3.1: Discover Listing Polish

Goal:

- make the full `See all` discovery listing pages feel intentional and v1-ready

Outline:

- refine full Discover listing page layout
- improve poster grid/list card sizing and spacing
- improve page titles and mode/media context
- polish load-more behavior
- tune empty, loading, and error states for browse pages
- verify FlatList performance on the full listing screens
- keep the pages browse-only, with no journal CRUD or personalization

Deliverable:

- user can open `See all` from Discover and browse a polished full listing page for one mode and media type

## Phase 4: Title Details and Journal Entry Flow

Goal:

- implement the core journal interaction loop

Outline:

- build Title Details screen
- build Add / Edit Journal Entry modal
- create journal entry mutation flow
- support status selection
- support rating input
- support optional review headline
- support review body and spoiler toggle
- support delete entry flow
- store `completed_on` where relevant

Deliverable:

- user can find a title, open its details, and add or edit a journal entry

## Phase 5: Journal Screen

Goal:

- give users a strong personal journal experience

Outline:

- build Journal screen shell
- build Timeline view
- build Calendar view
- add filters for media type, status, and rating
- add sorting controls
- define activity/date display behavior
- connect journal list queries

Deliverable:

- user can browse, filter, and revisit their logged entries

## Phase 6: Lists

Goal:

- let users organize media into custom mixed-media collections

Outline:

- build Lists overview screen
- build Single List Details screen
- create list creation flow
- support adding media to lists
- support removing items from lists
- support optional `list_items.note`

Deliverable:

- user can create and manage custom lists

## Phase 7: Profile and Dashboard

Goal:

- make the app feel personal and reflective, not just functional

Outline:

- build Profile screen
- calculate user stats
- show top-rated items
- show recent reviews
- show created lists
- build Dashboard content inside Home
- connect in-progress and recently added sections

Deliverable:

- user can see their taste, activity, and summary at a glance

## Phase 8: Settings and Account Management

Goal:

- complete the production-ready account experience

Outline:

- build Settings screen
- edit profile flow
- avatar update flow
- connected accounts section
- sign out flow
- account deletion flow
- add Privacy Policy / Terms / Credits entry points

Deliverable:

- app includes essential account and legal management flows

## Phase 9: Quality and Production Hardening

Goal:

- bring the app from “working” to “shippable”

Outline:

- improve loading states and skeletons
- improve empty states
- improve error handling and retry behavior
- audit UX consistency
- add analytics and crash reporting if chosen
- review accessibility basics
- verify auth flows across platforms
- verify deep links and redirects
- verify attribution and policy screens

Deliverable:

- v1 is stable enough for store submission preparation

## Phase 10: Launch Preparation

Goal:

- prepare for App Store and Play Store release

Outline:

- finalize app icon and splash
- finalize metadata and screenshots
- prepare privacy disclosures
- test release builds
- fix release-only issues
- prepare first launch checklist

Deliverable:

- app is ready for release submission

## Suggested Build Order Summary

1. Project setup
2. Auth and app shell
3. Core TMDB integration
4. Discovery and search
5. Discover listing polish
6. Title details and journal entry flow
7. Journal screen
8. Lists
9. Profile and dashboard
10. Settings and account management
11. Quality hardening
12. Launch preparation

## What Is Intentionally Deferred

- IGDB game integration
- social features
- comments and likes
- recommendation engine
- long-form reviews
- detailed progress tracking beyond current v1 scope

## Next Expansion For This Document

Later, this file can be expanded with:

- milestone breakdowns
- issue/task mapping
- acceptance criteria
- technical dependencies
- testing checklist
- release checklist
