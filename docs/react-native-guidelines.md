# React Native Guidelines

## Purpose

This document defines the default engineering rules for this project so the codebase stays:

- Readable
- Stable
- Production-ready
- Easy to extend
- Free from unnecessary abstraction and bloat

These guidelines are optimized for this project's locked stack and product direction.

## Project Context

This project is a:

- `journal-first` entertainment tracking app
- built with `Expo`, `React Native`, and `TypeScript`
- using `Supabase` for backend services
- using `TMDB` for movies, series, and anime in v1

## Core Principles

1. Prefer clarity over cleverness.
2. Keep screens thin and focused on UI composition.
3. Keep data flow explicit.
4. Do not add abstractions before they are needed.
5. Prefer a few good reusable components over a large vague design system.
6. Build for production, not just for demos.
7. Optimize for maintainability first, micro-optimization second.

## Architecture Rules

### Use feature-oriented organization

Code should be grouped by domain or feature where practical, not by file type alone.

Good examples:

- `features/auth`
- `features/journal`
- `features/lists`
- `features/profile`
- `features/discovery`

Shared code should stay small and intentional:

- `components`
- `lib`
- `hooks`
- `constants`
- `types`

### Keep screens thin

Screens should:

- compose layout
- call hooks
- trigger actions
- render states

Screens should not:

- contain heavy transformation logic
- contain large inline helper functions
- normalize third-party API data
- own business rules that belong in hooks or services

### Keep business logic out of UI files

Move non-trivial logic into:

- feature hooks
- service modules
- utility functions with clear ownership

Examples:

- auth flows
- journal mutations
- search normalization
- list creation rules
- metadata mapping

## Navigation Rules

Use:

- `Expo Router`

Navigation structure should follow the locked product model:

- tab navigation for primary destinations
- stack navigation for secondary screens
- modal routes for fast entry/edit flows

Use modals for:

- add/edit journal entry
- lightweight focused flows

Do not create deep confusing navigation trees unless clearly necessary.

## Styling Rules

Use:

- `NativeWind`

### Styling principles

1. Prefer consistent design tokens over one-off values.
2. Reuse spacing, radius, and typography patterns.
3. Keep layouts simple and intentional.
4. Avoid random color usage.
5. Avoid giant style objects with duplicated values.

### Design system guidance

Define and reuse:

- colors
- spacing scale
- radius scale
- typography scale
- shadows
- semantic states like success, error, muted, surface

### Avoid

- mixing many styling paradigms in the same feature
- excessive inline conditional styling when a reusable variant would be cleaner
- overusing absolute positioning for core layouts
- building web-style utility soup without extracting repeated UI patterns

## Component Rules

### Build a small shared component layer

Prefer a small stable set of reusable app primitives such as:

- `Button`
- `TextField`
- `Avatar`
- `Card`
- `Chip`
- `RatingInput`
- `SectionHeader`
- `EmptyState`
- `LoadingState`

### Component design rules

Components should:

- have a clear single responsibility
- have predictable props
- support composition
- stay easy to read in usage sites

Components should not:

- try to solve every future use case
- expose too many boolean flags
- mix unrelated responsibilities

If a component starts needing many modes, split it.

### Component library usage

We may selectively use a helper library such as `React Native Paper`, but:

- only for utility primitives when it genuinely reduces work
- not as the main visual identity of the app

The app should feel custom, not like a stock Material template.

## State Management Rules

### Server state

Use:

- `TanStack Query`

TanStack Query should handle:

- fetching
- caching
- invalidation
- loading states
- mutation flows

### Local UI state

Use:

- component state
- reducer state for medium-complex interaction when necessary

### Avoid

- introducing a large global store unless a real cross-screen state problem appears
- storing server state in ad hoc global state
- duplicating query data in multiple places

## Data Layer Rules

### Backend access

Use:

- `Supabase` for app data
- `Supabase Edge Functions` for third-party API integration

### Never do this in production

- call TMDB directly from the mobile client with private credentials
- mix raw external API responses all over the UI layer

### Normalize external data

Create a consistent internal media shape before it reaches UI components.

For example, UI code should not care whether data came from TMDB or a future games source.

### Database rules

Use:

- SQL migrations
- generated TypeScript database types

Do not use:

- ORM in v1

## Hook Rules

Custom hooks are encouraged when they:

- hide repetitive query or mutation wiring
- centralize business logic
- simplify screen components

Examples:

- `useCurrentUser`
- `useJournalEntries`
- `useCreateJournalEntry`
- `useSearchTitles`
- `useUserLists`

Avoid hooks that become “miscellaneous logic bags”.

## Forms and Validation

Forms should:

- validate required fields
- show inline errors clearly
- disable submit during active request when needed
- handle success and failure states explicitly

Keep validation rules close to the form or feature they belong to.

Avoid hidden validation behavior.

## Error Handling

Every networked flow should consider:

- loading
- empty
- error
- retry

Do not swallow errors silently.

User-facing errors should be:

- concise
- calm
- actionable where possible

Developer-facing logs should still preserve useful detail.

## Performance Guidelines

Do not optimize everything early, but do avoid obvious problems.

Prefer:

- stable list item structures
- paginated or chunked rendering where appropriate
- lightweight screen trees
- memoization only when there is a proven reason

Avoid:

- premature `useMemo` and `useCallback` everywhere
- giant render functions with many nested closures
- unnecessary rerender chains caused by unstable props

If a screen becomes slow, profile it before “fixing” it.

## File and Naming Rules

### Naming

Use consistent naming:

- components: `PascalCase`
- hooks: `useSomething`
- helpers/utilities: `camelCase`
- route files: follow Expo Router conventions

### File size guidance

Prefer smaller focused files.

If a file becomes hard to scan, split it by responsibility.

As a rough guideline:

- components and hooks should usually stay reasonably compact
- very large files need a clear reason

### Avoid

- generic names like `utils.ts`, `helpers.ts`, `common.ts` without clear scope
- dumping unrelated constants into one file
- giant index barrels that hide ownership

## TypeScript Rules

Use strict TypeScript and clear types.

Prefer:

- explicit domain types
- narrow prop types
- typed query results
- typed mutation inputs

Avoid:

- `any`
- broad optional types when fields are actually required
- deeply nested inferred types that are unreadable in practice

If a type is reused across the same domain, give it a real name.

## Accessibility and UX

Build with production usability in mind:

- touch targets should be comfortable
- text should remain readable
- contrast should be considered
- loading and disabled states should be obvious
- destructive actions should be clearly separated

Forms and buttons should not be ambiguous.

## Platform Rules

Respect platform differences where it improves UX:

- `Sign in with Apple` on iOS
- Android and iOS interaction differences where needed

But avoid unnecessary platform branching in shared UI.

## Testing and Quality

Focus early tests on:

- business logic
- data normalization
- validation
- critical hooks

Do not try to test every visual detail immediately.

For UI quality, favor:

- careful component boundaries
- good manual testing
- predictable state handling

## Code Smells To Avoid

Avoid:

- giant screen components
- over-abstracted wrappers
- vague helper modules
- duplicate API transformation logic
- inconsistent naming
- premature generic systems
- hidden side effects inside UI components
- mixing navigation, fetching, parsing, and rendering into one file

## Default Decision Checklist

Before adding a new abstraction, ask:

1. Does this solve a repeated problem that already exists now?
2. Will this make the calling code easier to read?
3. Is ownership of this logic clear?
4. Would a simpler function or component be enough?

If the answer is unclear, choose the simpler option.

## Project-Specific Implementation Defaults

Unless there is a strong reason otherwise:

- use `Expo Router`
- use `NativeWind`
- use `TanStack Query`
- use `Supabase Edge Functions` for external API integration
- use `Supabase Postgres` with generated types
- keep journal entry creation/editing in a modal flow
- keep Profile summary-focused
- keep Journal management-focused
- keep Lists mixed-media by default

## How To Use This Document

When making architecture or code-structure decisions:

1. Prefer the simplest option that matches these rules.
2. Keep code readable for future contributors.
3. If breaking one of these guidelines, document why in the relevant PR or file comment.
