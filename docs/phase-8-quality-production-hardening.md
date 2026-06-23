# Phase 8 Quality And Production Hardening

## Purpose

Track the Phase 8 hardening pass against the outline in `docs/feature-plan.md`.

Phase 8 is complete only when the code-level hardening items are implemented and the platform/manual verification gates are either completed or explicitly carried as release blockers.

## Current Phase Status

Status: active

We are still in Phase 8. The main v1 product surfaces are already implemented, and the remaining work is now production hardening, release-blocker cleanup, and real-device/manual verification.

Launch auth decision:

- Android launch auth: Google.
- iOS launch auth: Google and Apple.
- Email OTP / magic link is dormant for v1 launch because production SMTP requires a verified sending domain that is not available yet.

Do not start Phase 9 launch preparation until the active production auth blockers are resolved or explicitly accepted as release risks. Phase 9 depends on stable auth, redirects, and app identity because screenshots, privacy disclosures, and release builds should be tested against the final production-like setup.

## Immediate Phase 8 Plan

Work through these items in order.

1. Defer email auth for launch
   - Hide Email OTP / magic-link entry points for v1 launch.
   - Keep the existing email auth implementation in the codebase behind a launch flag.
   - Move Resend/custom SMTP setup to a post-domain follow-up.
   - Linear: `TAR-73`.
   - Execution checklist: `docs/phase-8-tar-73-resend-smtp.md`.

2. Google OAuth consent branding
   - Update Google OAuth consent/app branding so the sign-in flow clearly presents Revit.
   - Remove or avoid user-facing gibberish/Supabase-project identity where possible.
   - Verify the final consent screen on web and mobile.
   - Linear: `TAR-93`.

3. Apple Sign-In production verification
   - Verify Apple Sign-In on a real iOS device or production-like iOS build with the Apple Sign-In capability.
   - Confirm Apple users without profiles route to onboarding.
   - Confirm Apple users with profiles route into the app.

4. Supabase redirect and callback cleanup
   - Set the final production Site URL and Additional Redirect URLs.
   - Keep valid development callback URLs only while actively testing them.
   - Remove stale local IP / temporary Expo Go callback URLs before release.
   - Verify `revit://callback` and any production web callback URL.

5. Platform auth verification
   - Verify Google sign-in on Android/dev build and iOS/dev or production-like build.
   - Verify Apple Sign-In on iOS.
   - Confirm hidden email auth cannot be reached from the launch welcome flow.

6. Remaining hardening pass
   - Run fresh-account empty-state QA.
   - Run slow/failing-network QA for loading, error, and retry states.
   - Run a basic VoiceOver/TalkBack accessibility pass.
   - Triage the UX consistency report into required v1 fixes versus Phase 9 polish.
   - Finalize policy/support contact copy.

Deferred until a domain is available:

- Supabase production email delivery
   - Configure Resend/custom SMTP for Supabase Auth.
   - Verify OTP and magic-link deliverability.
   - Confirm sender name, sender address, and reply-to behavior.
   - Linear: `TAR-73`.
   - Execution checklist: `docs/phase-8-tar-73-resend-smtp.md`.
- Branded Supabase auth emails
   - Replace plain/default Supabase auth templates with Revit-branded email templates.
   - Support both OTP code entry and magic-link fallback where practical.
   - Include final support/contact context and clear expiration/safety copy.
   - Verify templates on mobile and desktop email clients.

Phase 8 can be considered complete only after the items above are done and any remaining risks are moved into `docs/release-blockers.md` with an explicit release decision.

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

Status: active, email auth deferred for launch

Current state:

- Email OTP supports one-time code verification.
- Email magic-link redirects now use the centralized callback URL.
- Google OAuth uses the centralized callback URL and callback route.
- Apple Sign-In is implemented for supported iOS devices only.
- Email OTP / magic link is hidden from the launch welcome flow because custom SMTP requires a verified domain.

Remaining check:

- Update Google OAuth consent branding before final OAuth verification.
- Verify Google OAuth on Android/dev build and iOS/dev or production-like builds.
- Verify Apple Sign-In on a real iOS device or production-like iOS build with Apple Sign-In capability.
- Keep the Apple Sign-In release blocker open until device verification is complete.
- Keep TAR-73 deferred until a sending domain is available.

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

1. Email auth is confirmed hidden/dormant for v1 launch.
2. Google OAuth consent branding clearly presents Revit.
3. Apple Sign-In is verified on a production-like iOS build or real device.
4. Launch auth flows are manually verified across the required platforms.
5. Deep links and redirects are verified against the Supabase allow-list.
6. Policy, attribution, and support copy is reviewed with final production contact details.
7. The UX consistency report is triaged for required v1 fixes.
8. Accessibility basics receive a real device/screen-reader pass.

After that, move to Phase 9: app icon/splash finalization, store metadata, screenshots, privacy disclosures, release builds, release-only fixes, and store submission.
