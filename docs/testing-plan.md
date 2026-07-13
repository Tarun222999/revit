# Revit Testing Plan

## Purpose

This document explains how we will add automated and manual testing to Revit while learning testing concepts step by step.

The goal is not to test every line of code. The goal is to protect the important user journeys and the business rules that matter for release quality.

## Current Baseline

- Jest, `jest-expo`, and React Native Testing Library are configured.
- The automated suite currently contains 64 passing tests across nine test files.
- Unit, model, validation, focused component, route-boundary, and data-hook behavior are covered; built-app coverage remains future work.
- `npm run typecheck` passes.
- `npm run lint` passes.
- The app uses Expo 54, React Native 0.81, React 19, TypeScript, Expo Router, Supabase, and TanStack Query.
- Phase 8 still requires real-device checks for authentication, deep links, accessibility, loading states, empty states, and failed-network behavior.

## Current Progress

- Step 0: testing contract and roadmap — complete.
- Step 1: test foundation — complete.
- Step 2: journal form rules — complete.
- Step 3: journal and media models — complete.
- Step 4: list and profile validation — complete.
- Step 5: important components — complete.
- Step 6: navigation and auth boundaries — complete.
- Step 7: data hooks and mutation states — complete.
- Step 8: Maestro smoke suite — flow files added; device execution pending.

## Recommended Testing Stack

### 1. Jest and `jest-expo`

Jest will run JavaScript and TypeScript tests. `jest-expo` provides the Expo-specific Jest environment and native-module mocks.

### 2. React Native Testing Library

React Native Testing Library will test components and hooks through user-visible behavior such as text, labels, buttons, and input changes.

### 3. Expo Router Testing Library

`expo-router/testing-library` will test route rendering, redirects, route parameters, and deep-link behavior without launching a full device build.

### 4. Maestro

Maestro will cover a small set of end-to-end flows against a built Android or iOS app. It is useful for checking that the real app launches and that multiple screens work together.

We will not add Detox at the beginning. It is powerful, but it introduces more native setup than we need for the first testing pass.

## What the Test Types Mean

### Unit test

Tests one small function in isolation.

Example: confirming that a review longer than 500 characters is rejected.

### Component test

Renders one component and checks how it responds to user interaction.

Example: selecting `Completed` shows the completion-date control.

### Integration test

Tests multiple pieces working together.

Example: submitting the journal form calls the mutation and shows a success or error state.

### End-to-end test

Launches the built app and follows a real user flow.

Example: search for a title, open its details, add it to the journal, and confirm the journal entry appears.

### Manual test

Checks behavior that is difficult or expensive to automate reliably.

Example: Google OAuth, Apple Sign-In, VoiceOver/TalkBack, real network behavior, and platform-specific permissions.

## Expected Test Size

The first useful release suite should contain approximately:

- 35–50 unit tests
- 20–30 component/integration tests
- 8–12 Maestro end-to-end flows
- 20–30 manual release checks

That is approximately 65–90 automated tests. The exact number is less important than whether the important behaviors are covered.

## Testing Principles

1. Test behavior, not implementation details.
2. Prefer small, readable tests with one clear reason to fail.
3. Test important edge cases, not only the happy path.
4. Keep network and Supabase calls mocked in unit/component tests.
5. Use realistic fixtures instead of repeating large inline objects.
6. Keep test files outside the `app/` route directory.
7. Add a regression test whenever we fix a meaningful bug.
8. Do not chase an arbitrary coverage percentage.

## Implementation Sequence

We will complete these steps strictly one at a time. After each step, we will run the tests, review what the failures mean, and pause for approval before starting the next step.

### Step 0: Agree on the testing contract

Learn:

- What each test type is for
- How a test passes or fails
- How mocks differ from real services
- How tests fit into the release process

Deliverables:

- This plan is accepted.
- We choose the initial test command and file locations.
- We agree that the first implementation slice will be small.

### Step 1: Add the test foundation

Install and configure:

- `jest`
- `jest-expo`
- `@testing-library/react-native`
- the required Jest TypeScript configuration

Add:

- a `test` script
- a basic setup file
- one intentionally simple passing test

Learning outcome:

- Run one test locally.
- Understand the test output.
- Understand the difference between a test file and an individual test case.

### Step 2: Test journal form rules

Start with `features/journal/model/journalEntryForm.ts` because it contains pure functions and does not require a device or Supabase.

Cover:

- valid default values
- future release dates
- invalid calendar dates
- completed-date validation
- started-date validation
- review headline length
- review body length
- clearing rating and review values
- unreleased titles becoming planned-only entries

Learning outcome:

- Write a small unit test.
- Arrange input, act by calling a function, and assert the result.
- Add boundary and invalid-input cases.

### Step 3: Test journal and media models

Cover:

- journal row normalization
- unsupported status/media/source handling
- media type filters
- status filters
- rating filters
- date filters
- journal sorting
- timeline month grouping
- calendar month navigation
- calendar activity levels
- average ratings and best-day calculations
- duplicate media removal

Likely source areas:

- `features/journal/model/`
- `features/discovery/utils/dedupeMediaItems.ts`
- `features/media/model/`

Learning outcome:

- Test date-sensitive logic.
- Test that functions do not mutate their input.
- Use shared fixtures without hiding what each test is checking.

### Step 4: Test list and profile validation

Cover:

- required list names
- whitespace-only names
- maximum list name length
- maximum description length
- touched-field error visibility
- profile username normalization and validation
- profile error mapping

Learning outcome:

- Test form behavior separately from the visual form component.
- Understand why validation tests are faster and more stable than testing every visual detail.

### Step 5: Test important components

Use React Native Testing Library for focused behavior tests.

Prioritize:

- `JournalEntryForm`
- `JournalStatusSelector`
- `RatingInput`
- `SpoilerToggle`
- `ListForm`
- `EmailCodeScreen` validation behavior
- loading, empty, error, and retry states

Check:

- visible labels and accessible roles
- input changes
- disabled and loading states
- validation messages
- callback payloads
- destructive-action separation

Learning outcome:

- Query elements the way a user or assistive technology would find them.
- Avoid tests coupled to CSS classes or component internals.

Completed in the first component slice:

- journal status selection, rating clearing, and spoiler toggling
- released and unreleased journal-entry form behavior
- list form validation and callback behavior
- invalid email validation and the successful email-code transition

The remaining loading, empty, error, and retry states will be added where they belong during Steps 6 and 7.

### Step 6: Test navigation and auth boundaries

Use Expo Router testing utilities for:

- unauthenticated users being sent to Welcome
- authenticated users without a profile being sent to Onboarding
- authenticated users with a profile reaching the tab shell
- public legal/support routes remaining accessible
- callback route behavior
- title, list, profile, and modal route parameters

Learning outcome:

- Test navigation without manually launching the app.
- Understand route state, redirects, and deep-link inputs.

Completed in this step:

- unauthenticated private-route redirects to Welcome
- signed-in users without profiles redirect to Onboarding
- signed-in users with profiles leave auth routes for the tab shell
- public legal/support routes remain available without a session
- callback routes handle missing codes and route users based on profile presence
- title, list, profile, and journal-modal route parameters reach their screens

The tests use mocked Expo Router hooks and route wrappers so they stay local and deterministic. A full built-app navigation pass remains part of the later Maestro and device checks.

### Step 7: Test data hooks and mutation states

Mock Supabase and Edge Function responses. Do not use production data.

Prioritize:

- search success, empty, and error states
- discovery loading and retry states
- journal fetch/create/update/delete behavior
- list create/update/delete behavior
- profile update and account deletion behavior
- query invalidation after mutations

Learning outcome:

- Test asynchronous code.
- Test both success and failure.
- Understand why loading and error states are part of the feature contract.

Completed in this step:

- search disabled, success, empty, and error states
- discovery retry recovery after a failed request
- media-details query gating until a route id exists
- journal create/delete cache writes and list invalidation
- list-create invalidation
- profile cache updates and account-deletion cleanup/sign-out

Supabase and Edge Function boundaries remain mocked, so these tests are safe to run locally without production data or a device.

### Step 8: Add a small Maestro smoke suite

Start with flows that do not require automating third-party OAuth screens:

- app launches successfully
- main tabs are reachable
- search opens a title details screen
- journal entry modal opens and validates input
- list creation opens and validates input
- legal/support routes open

Authentication providers, Apple capability, and deep-link handoff will remain part of the manual device checklist unless a stable test environment is available.

Implementation status:

- Added `.maestro/public-auth-and-legal.yaml` for unauthenticated launch, legal routes, and the public Support deep link.
- Added `.maestro/email-validation.yaml` for email navigation and invalid-email validation.
- Added `.maestro/authenticated-navigation.yaml` for tab access and list-form validation after onboarding.
- Added `.maestro/README.md` with platform identifiers, run commands, and preconditions.
- The Maestro CLI and an installed simulator/device are not available in this workspace, so execution remains pending.

Learning outcome:

- Understand the difference between mocked component tests and real built-app tests.
- Capture failures from a real device or simulator.

### Step 9: Add release checks and CI

The normal validation command should eventually include:

```text
npm run test
npm run typecheck
npm run lint
```

Add Maestro to a separate release or EAS workflow once the local flows are stable. Do not make every local test depend on a cloud build.

Maintain a manual checklist for:

- Google OAuth on Android
- Google OAuth on iOS
- Apple Sign-In on iOS
- callback and deep-link routing
- fresh-account empty states
- slow and failed network behavior
- VoiceOver and TalkBack
- account deletion
- release build launch and update behavior

## Suggested Test Organization

Keep tests outside `app/`, for example:

```text
__tests__/
  setup/
  fixtures/
  journal/
  discovery/
  lists/
  auth/
  profile/
  navigation/
  components/

.maestro/
  launch.yml
  navigation.yml
  search-title.yml
  journal-entry.yml
  list-creation.yml
```

Feature-local tests may also sit beside feature code when that makes ownership clearer. We should avoid one giant test folder for unrelated behavior.

## Definition of Done

Testing work is complete for the first release when:

- the test command runs reliably from a clean install
- critical journal, list, auth, and navigation rules have automated coverage
- success, empty, loading, validation, and error states are covered where practical
- at least a small built-app smoke suite passes
- release-blocking manual checks are documented and executed on the required devices
- every known failure is either fixed or recorded as an explicit release risk

## How We Will Work Together

For every implementation step:

1. I explain the concept before changing code.
2. We add the smallest useful test slice.
3. We run the tests and read the output together.
4. I explain any failure in plain language.
5. We pause for your approval before moving to the next step.

The next action after approval will be Step 8 execution on an installed simulator/device. Step 9 should wait until these smoke flows have been run and any device-specific failures are reviewed.
