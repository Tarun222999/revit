# TAR-189 — In-App User Feedback Implementation

## Document Status

- Status: Approved implementation plan
- Product direction: Approved September 12, 2026
- Implementation: Approved in full September 12, 2026
- Target: v1.3
- Linear issue: [TAR-189](https://linear.app/tarun495/issue/TAR-189/v13-in-app-bug-reports-and-user-feedback)
- Product proposal: `docs/v1.3/tar-189-user-feedback.md`
- HTML concept: `docs/concepts/redesigned-feedback-flow.html`
- Last updated: September 12, 2026

## Purpose

Implement the approved Help & Feedback flow without expanding it into a public
roadmap, chat-support system, telemetry pipeline, or automatic Linear bridge.

This plan follows the repository phase rule: complete one implementation step,
report its verification, and wait for explicit approval before beginning the
next step.

## Locked Scope

- Signed-in users can submit `Bug`, `Feature idea`, or `Other` feedback.
- Profile contains one `Help & Feedback` entry point.
- The Help & Feedback hub links to the form and the existing support screen.
- Safe app, platform, and source-screen context is attached automatically.
- Reports are stored in a private Supabase table.
- There is no user-facing report history.
- Screenshot attachments are deferred.
- Linear issue creation remains a manual triage action outside the app.
- Account, privacy, deletion, and sensitive-data help stays in the existing
  support channel.

## Technical Direction

### Feature ownership

Create a focused `features/feedback` domain for:

- form types and validation
- safe application-context collection
- Supabase insert logic
- TanStack Query mutation state
- Help & Feedback and submission UI

Keep route files thin:

- `app/help-feedback.tsx`
- `app/modals/feedback.tsx`

The existing `app/support.tsx` route remains the destination for account,
privacy, deletion, and sensitive-data support.

### Data model

Add `public.feedback_reports` with a narrow, explicit contract:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `category text not null`
- `message text not null`
- `source_screen text null`
- `error_code text null`
- `app_version text null`
- `build_number text null`
- `platform text null`
- `os_version text null`
- `contact_allowed boolean not null default false`
- `status text not null default 'new'`
- `created_at timestamptz not null default now()`

Use check constraints for:

- category in `bug`, `feature_idea`, `other`
- status in `new`, `reviewed`, `planned`, `closed`
- trimmed message length from 1 through 1,200 characters
- reasonable maximum lengths on client-supplied context strings

The returned database UUID is the report reference. The UI may present a
shortened, uppercase form such as `RV-12AB34CD`; it is a receipt, not an
authentication secret.

### Access model

- Enable RLS before exposing the table to the client.
- Grant only the privileges required by the authenticated client.
- Allow authenticated users to insert rows only when
  `(select auth.uid()) = user_id`.
- Allow authenticated users to select only their own rows so PostgREST can
  return the inserted ID. Do not build a history UI in this scope.
- Do not grant client update or delete access.
- Do not grant anonymous access.
- Do not use user-editable JWT metadata for authorization.
- Do not place a service-role or Linear credential in the app.

The migration must include explicit Data API grants because current Supabase
projects may not expose new public tables automatically. RLS and SQL grants are
separate controls and both must be reviewed.

### Safe context

Collect only:

- Expo application version and native build version
- React Native platform and OS version
- a bounded app-owned source-screen identifier

Do not collect:

- passwords, OTPs, tokens, request headers, or API keys
- raw logs or stack traces
- journal notes, reviews, list notes, search history, or other content
- device advertising identifiers or precise location
- screenshots in this release

## Ordered Implementation Sequence

### Step 1 — Database contract, RLS, and generated types

1. Create the migration through `supabase migration new`.
2. Add `feedback_reports`, constraints, ownership index, RLS policies, and
   explicit authenticated Data API grants.
3. Regenerate or update the checked-in database types through the repository's
   established workflow.
4. Add database-level verification for valid insert, invalid category,
   over-limit message, cross-user read, client update/delete denial, and
   anonymous denial.
5. Run Supabase security and performance advisors after the schema change.

Stop after this step and wait for approval.

### Step 2 — Feedback domain and submission mutation

1. Add feedback categories, input/output types, and validation.
2. Add a safe context collector using existing Expo and React Native APIs.
3. Add the typed Supabase insert that returns only the report ID.
4. Add a TanStack Query mutation hook and calm error normalization.
5. Test validation, payload shaping, safe-context allowlisting, success, and
   failure behavior.

Do not add UI routes in this step. Stop and wait for approval.

### Step 3 — Help & Feedback hub

1. Add the thin `app/help-feedback.tsx` route and feature-owned screen.
2. Rename the Profile `Support` row to `Help & Feedback` and route it to the
   new hub.
3. Add `Report a problem`, `Suggest an idea`, and `Contact support` actions.
4. Route `Contact support` to the existing public support screen.
5. Match the approved HTML hierarchy, spacing, states, and accessibility
   semantics using the existing Revit primitives and tokens.
6. Add focused navigation and accessibility tests.

Stop after this step and wait for approval.

### Step 4 — Submission form and resilient completion flow

1. Add the thin modal route with initial category and source-screen params.
2. Build visible category controls, a labeled 1,200-character description,
   contact-permission control, safe-context summary, and secret warning.
3. Disable duplicate submission while pending.
4. Preserve the category, description, and contact choice after failure.
5. Show actionable retry feedback without closing the form.
6. Show the shortened report reference after success with `Done` and
   `Send another` actions.
7. Add validation, keyboard, large-text, screen-reader, failure-preservation,
   duplicate-submit, and success-state tests.

Stop after this step and wait for approval.

### Step 5 — Copy integration and bounded contextual entry point

1. Update the existing Support copy so structured product feedback points to
   Help & Feedback while account/privacy requests keep the official contact.
2. Add at most one contextual `Report this problem` integration to an existing
   high-value retryable error surface as a proving case.
3. Pass only an app-owned source-screen identifier and reviewed safe error code.
4. Confirm no raw error object, logs, headers, user content, or secrets enter
   route params or the report payload.
5. Test direct Profile entry, contextual entry, cancel/back behavior, and
   preservation of the originating screen.

Broader contextual integration requires a separate review after the proving
case. Stop after this step and wait for approval.

### Step 6 — End-to-end verification and release readiness

1. Run focused tests and the full repository verification gate.
2. Run web export and verify every route still resolves.
3. Verify iOS and Android keyboard behavior, safe-area layout, large text,
   screen-reader announcements, offline failure, retry, and duplicate taps.
4. Verify submitted rows contain only the approved fields and cannot be read
   across accounts or mutated from the client.
5. Re-run Supabase security and performance advisors.
6. Record physical-device gaps explicitly if they cannot be exercised in the
   implementation environment.

Stop after this step and report the final implementation outcome.

## Acceptance Criteria

1. A signed-in user can find Help & Feedback from Profile.
2. The user can submit a Bug, Feature idea, or Other report.
3. Category and a non-empty description are required and validated on the
   client and database boundary.
4. App version, build, platform, OS, and source-screen context are allowlisted
   and bounded.
5. The form visibly warns against sharing secrets.
6. Submission failure preserves user input and provides Retry.
7. Submission success shows a stable report reference.
8. Users cannot read another user's report or update/delete submitted reports.
9. Anonymous users cannot submit or read reports.
10. No privileged Supabase key or Linear credential ships in the client.
11. Contact support remains available for account, deletion, privacy, and data
    requests.
12. Normal app screens do not receive persistent feedback links.
13. Screenshot capture, automatic Linear creation, report history UI, public
    voting, NPS, and chat support remain absent.

## Verification Gate

Before marking implementation complete, run:

- focused database and feature tests
- `npm run test -- --runInBand`
- `npm run typecheck`
- `npm run typecheck:edge`
- `npm run lint`
- `npm run doctor`
- `npm run export:web`
- Supabase security and performance advisors

Physical iOS and Android verification remains required for final release
confidence even when automated checks pass.

## Approval

The user explicitly approved full implementation and PR delivery on September
12, 2026. That instruction authorizes every ordered step in this plan without
an approval pause between steps.
