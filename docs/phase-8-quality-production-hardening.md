# Phase 8 Quality And Production Hardening

## Purpose

Track the Phase 8 hardening pass against the outline in `docs/feature-plan.md`.

Phase 8 is complete only when the code-level hardening items are implemented and the platform/manual verification gates are either completed or explicitly carried as release blockers.

## Outline Audit

### Loading States And Skeletons

Status: mostly complete

Current state:

- Shared buttons expose loading and disabled behavior.
- Discovery, title details, journal, lists, profile, and journal entry modal surfaces have loading states.
- Recent work improved loading-state behavior and upload UI handling.

Remaining check:

- Run one manual pass on slow network or mocked delayed responses before release screenshots.

### Empty States

Status: mostly complete

Current state:

- Discovery/search, journal timeline/calendar, lists overview/details, and profile routes expose calm empty or placeholder states.
- List details empty-state copy was covered in Phase 6.1.

Remaining check:

- Manual pass with a fresh account to confirm all first-run states still read cleanly.

### Error Handling And Retry Behavior

Status: mostly complete

Current state:

- Query-backed surfaces show concise errors.
- Journal, lists, profile, title details, and modal mutation flows surface user-facing failures.
- Retry actions exist on primary query-error surfaces where practical.

Remaining check:

- Manual pass with failed Supabase function calls and failed network mutations.

### UX Consistency Audit

Status: report created

Current state:

- A UX consistency report has been created from design input.
- Recent upload and loading-state fixes have been applied.

Remaining check:

- Triage the report into required v1 fixes versus Phase 9 polish before release prep.

### Analytics And Crash Reporting

Status: deferred unless chosen

Current state:

- No analytics or crash reporting package is installed.

Release decision:

- Choose an analytics/crash reporting provider before production submission, or explicitly ship v1 without analytics.

### Accessibility Basics

Status: partial

Current state:

- Core interactive controls use accessibility roles/labels in many places, including profile avatar, journal controls, ratings, spoiler toggle, calendar days, and list actions.

Remaining check:

- Manual VoiceOver/TalkBack pass is still required before store submission.

### Auth Flows Across Platforms

Status: partially verified, release blocker remains

Current state:

- Email OTP supports one-time code verification.
- Email magic-link redirects now use the centralized callback URL.
- Google OAuth uses the centralized callback URL and callback route.
- Apple Sign-In is implemented for supported iOS devices only.

Remaining check:

- Verify Google OAuth on web, Expo Go/dev build, and production-like builds.
- Verify email OTP and magic-link callback on web and native.
- Verify Apple Sign-In on a real iOS device or production-like iOS build with Apple Sign-In capability.
- Keep the Apple Sign-In release blocker open until device verification is complete.

### Deep Links And Redirects

Status: code-level complete, manual verification required

Current state:

- App scheme is configured as `revit`.
- Auth redirects are centralized in `features/auth/utils/authRedirect.ts`.
- Google OAuth and email magic links now use the same `/callback` redirect strategy.
- The callback route exchanges auth codes and allows the auth gate to wait for callback completion.
- Root navigation redirects into the tab shell, whose first tab is Discover.

Remaining check:

- Supabase redirect allow-list must include development and production callback URLs.
- Verify `revit://callback` and the web callback URL in a dev/prod-like environment.
- Remove stale local IP callback URLs before release.

### Attribution And Policy Screens

Status: code-level complete

Current state:

- Privacy Policy, Terms of Use, Credits / Attributions, and Support screens exist.
- Profile/account links open all four screens.
- Welcome/auth links open Terms and Privacy.
- Direct deep links to Privacy, Terms, Credits, and Support are allowed without requiring an authenticated session.

Remaining check:

- Replace placeholder support/contact language with final store listing or support contact before release.
- Review legal copy before store submission.

## Phase 8 Completion Call

Code-level Phase 8 hardening is close, but Phase 8 should not be marked fully complete until:

1. Auth flows are manually verified across the required platforms.
2. Deep links and redirects are verified against the Supabase allow-list.
3. Policy, attribution, and support copy is reviewed with final production contact details.
4. The UX consistency report is triaged for required v1 fixes.
5. Accessibility basics receive a real device/screen-reader pass.

