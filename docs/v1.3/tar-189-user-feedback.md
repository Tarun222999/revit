# TAR-189 — In-App User Feedback

## Document Status

- Status: Approved product direction
- Target: v1.3
- Implementation: Approved in full September 12, 2026
- Linear issue: [TAR-189](https://linear.app/tarun495/issue/TAR-189/v13-in-app-bug-reports-and-user-feedback)
- Last updated: September 12, 2026

## Approved Decision

Add a focused `Help & Feedback` destination under Profile instead of placing a
persistent feedback link on every app screen.

The destination should help users:

- report a problem
- suggest an idea
- reach the existing support channel for account, privacy, and data requests

Contextual `Report this problem` actions may also appear in important error
states after a retry fails. Normal content screens should not carry a permanent
feedback link.

## Why This Direction

An always-visible link would compete with Journal, Discover, Lists, and title
actions. A single predictable destination keeps the interface calm while still
making feedback easy to find.

Separating product feedback from support also makes each path clearer:

- structured in-app reports are for bugs and product ideas
- the official support channel remains the path for account access, deletion,
  privacy, and sensitive data questions
- metadata corrections can explain when TMDB or IGDB owns the source record

## Proposed User Flow

### Entry point

Rename the current Profile row from `Support` to `Help & Feedback`.

The Help & Feedback screen presents three actions:

1. `Report a problem`
2. `Suggest an idea`
3. `Contact support`

The first two actions open one shared feedback form with the category already
selected. `Contact support` retains the official support contact and existing
safety guidance.

### Feedback form

Required:

- category: `Bug`, `Feature idea`, or `Other`
- description

Collected automatically:

- app version and build
- platform and OS version
- source screen, when available
- authenticated user ID as internal context
- submission timestamp

Optional:

- permission to contact the user about the report
- screenshot attachment in a later iteration

The form should not ask the user to reproduce technical context the app can
collect safely. It should explicitly warn users not to include passwords,
one-time codes, tokens, or other secrets.

### Completion

After a successful submission, keep the user in context and show:

- a short thank-you message
- a generated reference ID
- `Done`
- `Send another` as a secondary action

Failed submissions must preserve the typed description and provide a clear
retry action.

## Contextual Reporting

Do not place feedback links on every screen.

Allow `Report this problem` only where it provides useful context, such as:

- a repeated network failure after Retry
- an unexpected failure while saving a Journal action
- a list or profile mutation that cannot complete

Opening the form from an error state should attach the source screen and a safe
error code. It must not attach raw tokens, request headers, passwords, personal
journal text, or verbose logs without explicit review and consent.

## Data And Triage Direction

Use a private Supabase-backed intake queue as the source of truth. A minimal
record should contain:

- `id uuid primary key`
- `user_id uuid null`
- `category text not null`
- `message text not null`
- `source_screen text null`
- `app_version text null`
- `build_number text null`
- `platform text null`
- `os_version text null`
- `contact_allowed boolean not null default false`
- `status text not null default 'new'`
- `created_at timestamptz not null default now()`

The client must never contain a Linear API token. Feedback should be reviewed
and grouped before actionable reports become Linear issues. This avoids one
ticket per low-context submission and makes duplicates easier to consolidate.

RLS and server-side validation must prevent users from reading or changing
other users' reports. Users can submit feedback but the product will not expose
a submission-history screen in this scope.

## Approved Scope Defaults

- Feedback submission requires a signed-in user.
- Users cannot browse earlier submissions in the product UI.
- Screenshot attachments are deferred.
- Reports are stored privately in Supabase for manual triage.
- Reports do not automatically create Linear issues.
- Account, deletion, and privacy requests continue through the existing
  support channel.

## UX And Accessibility Requirements

- Use a pushed screen for the hub and a focused modal or pushed screen for the
  form.
- Keep one primary action per state.
- Provide visible labels; do not rely on placeholder-only fields.
- Keep touch targets at least 44 points.
- Announce validation, failure, and success states to assistive technology.
- Support large text without clipping category choices or actions.
- Preserve draft text if submission fails or the keyboard is dismissed.
- Do not use shake-to-report as the only entry point.
- Do not interrupt users with unsolicited feedback prompts in this scope.

## Out Of Scope

- public voting or a public feature-request board
- chat-based customer support
- automatic creation of a Linear issue for every submission
- background capture of screenshots, logs, or journal content
- app-rating or NPS prompts
- admin tooling beyond the minimum intake and triage path

## Acceptance Criteria For A Future Implementation

1. Profile contains one `Help & Feedback` entry point.
2. Users can submit a Bug, Feature idea, or Other report.
3. App, platform, and source-screen context is attached automatically where
   available.
4. The user is warned not to send secrets.
5. Submission failure preserves the draft and offers Retry.
6. Submission success provides a reference ID.
7. Account, deletion, and privacy help remains routed to the official support
   channel.
8. No Linear credential or privileged Supabase key ships in the client.
9. Reports are private and protected by reviewed RLS policies.
10. Normal app screens do not receive a persistent feedback link.

## Review Artifact

The interactive HTML concept is:

- `docs/concepts/redesigned-feedback-flow.html`

The product flow and visual direction were approved on September 12, 2026. The
ordered implementation plan is:

- `docs/v1.3/tar-189-user-feedback-implementation.md`
