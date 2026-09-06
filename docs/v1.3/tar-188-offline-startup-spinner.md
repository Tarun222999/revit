# TAR-188 — Offline startup spinner

Status: Investigation complete; fix proposal not implemented

## Reported behavior

When a signed-in user opens Revit with mobile data disabled, the app can show a
full-screen activity indicator indefinitely. The user receives no explanation,
offline state, retry action, or access to otherwise safe navigation.

The Linear issue does not include a reproduction video, device details, logs,
or attachments. The findings below are therefore based on the reported startup
symptom and the current `v1.3` client implementation.

## Findings

### 1. The visible spinner is owned by the global auth gate

`AuthGate` renders the application routes and then covers them with an absolute
full-screen activity indicator while either authentication or the signed-in
user's profile is unresolved.

This matches the reported symptom more closely than feature-level loading
states. Discover uses skeletons and section error states, while the auth gate is
the global surface that displays a spinner without explanatory copy.

### 2. Session restoration can wait on the network without an app deadline

`AuthProvider` starts with `loading = true` and clears it only after
`supabase.auth.getSession()` resolves or rejects. Supabase is configured with
persisted sessions and automatic token refresh.

On startup, Supabase first initializes its auth client. If the persisted access
token is expired or close enough to expiry to require refresh, initialization
can make a network request before `getSession()` completes. The app does not
bound this operation with a timeout or cancellation policy. If the native
request remains pending while mobile data is disabled, `loading` remains true
and `AuthGate` keeps the full-screen spinner visible.

### 3. Profile resolution creates a second blocking network dependency

If a usable session is restored locally, `AuthGate` immediately calls
`useCurrentProfile`. The underlying profile query also has no timeout. While
that initial query is pending, the same full-screen spinner remains visible.

The shared TanStack Query configuration retries queries once, but a retry only
helps after a request rejects. It does not place a deadline on a request that
never settles.

### 4. React Native connectivity is not connected to query behavior

The project has no React Native network-status adapter connected to TanStack
Query's `onlineManager`, and it has no app-level connectivity state. The client
therefore cannot deliberately distinguish an offline device from a slow server
or an ordinary initial load.

### 5. A profile request failure is confused with a missing profile

The auth gate checks whether `profileQuery.data` exists but does not first
handle `profileQuery.isError`. After a failed request, an existing user's
profile can therefore be treated as absent and the user can be redirected to
onboarding.

Only a successful profile request returning `null` should mean that onboarding
is required. A timeout, offline failure, or server error must not be interpreted
as evidence that the profile does not exist.

### 6. The failure is systemic, although startup has the largest impact

Most client Supabase requests do not have a bounded request duration. Feature
screens generally contain error and retry components, but those components
cannot render until their request settles. The `app-capabilities` request is a
useful existing exception: it has a ten-second deadline and fails closed.

TAR-188 should fix the startup/authentication boundary first. A broader request
timeout and connectivity audit can follow without expanding this ticket into a
full offline-sync project. The approved stack explicitly avoids overbuilding
offline synchronization.

## Root cause

The root cause is an unbounded network-dependent startup state combined with a
global UI gate that represents every unresolved state as a spinner.

The failure sequence is:

1. The app starts with authentication marked as loading.
2. Session initialization or profile loading requires a network response.
3. Mobile data is unavailable and the request remains pending.
4. No timeout converts the pending request into an error.
5. No connectivity observer classifies the device as offline.
6. `AuthGate` continues rendering its full-screen activity indicator.

Depending on the persisted token's expiry, the request can stall during either
session restoration or profile resolution. Both paths need bounded behavior.

## Proposed fix

### Startup state model

Replace the implicit boolean-only gate with explicit outcomes:

```text
loading
  -> authenticated
  -> unauthenticated
  -> profile-missing
  -> offline
  -> error
```

- `loading` is temporary and bounded.
- `authenticated` renders the requested private route.
- `unauthenticated` routes to Welcome.
- `profile-missing` routes to Onboarding only after a successful profile query
  returns no row.
- `offline` preserves the local session and presents a retryable offline state.
- `error` presents a retryable generic startup error without signing the user
  out or routing to Onboarding.

### Actionable offline component

Render an app-owned full-screen state from `AuthGate` after the startup request
is classified as offline or exceeds its deadline. Reuse or extend the existing
`ErrorState` presentation rather than introducing an unrelated visual system.

Recommended copy:

- Title: `You're offline`
- Message: `Revit couldn't verify your account. Check your connection and try
  again.`
- Primary action: `Try again`

The component must:

- replace the indefinite activity indicator after a bounded loading period
- rerun the session/profile resolution when `Try again` is pressed
- disable or show progress on the retry action while that retry is active
- keep the persisted session intact
- never redirect to Onboarding because of a network failure
- expose an accessible title, message, and button
- allow public legal and support routes to remain reachable under the existing
  route policy

When connectivity returns, the app may automatically retry once. The explicit
button must remain available so recovery does not depend solely on a network
event being delivered.

### Request deadlines

Add bounded deadlines to both startup dependencies:

1. Supabase session restoration, including the case where initialization is
   waiting for an automatic token refresh.
2. The initial current-profile query.

A deadline should stop the application's wait and show the recoverable state.
It does not need to invalidate the stored session. Where supported, the
underlying request should also be aborted to avoid leaving unnecessary work in
flight.

Timeout errors should be normalized into calm user-facing copy while retaining
the original technical error for development diagnostics.

### Connectivity integration

Connect a React Native connectivity source to TanStack Query's
`onlineManager`. This allows queries to pause and resume intentionally and lets
the startup gate distinguish known offline state from an unknown request
failure.

Connectivity detection complements request deadlines; it does not replace
them. A device can report connectivity while the service remains unreachable.

### Cached-content behavior outside the auth gate

This ticket does not require full offline support. For ordinary feature
queries:

- preserve already cached content during a failed background refresh
- show a small offline notice when cached content remains usable
- show the full error/retry component only when no usable content exists
- do not leave a skeleton or spinner visible indefinitely

## Proposed implementation sequence

Implementation must proceed one step at a time with explicit approval before
starting each next step.

1. Add tests for an unresolved session request, a profile timeout/error, retry
   recovery, and the distinction between a missing profile and a failed profile
   request.
2. Introduce the bounded startup result/error model without changing unrelated
   feature queries.
3. Replace the auth gate's indefinite spinner with the actionable offline/error
   state and retry behavior.
4. Connect React Native connectivity to TanStack Query and add automatic
   recovery when the device becomes online.
5. Verify startup on physical Android and iOS devices with mobile data and Wi-Fi
   disabled, restored, and intermittently available.

## Acceptance criteria

1. A startup spinner cannot remain indefinitely because a session or profile
   request never settles.
2. A signed-in user who starts offline sees calm offline copy and a working
   `Try again` action.
3. Retrying while still offline keeps the user on the recoverable state and
   does not sign them out.
4. Restoring connectivity and retrying opens the app when the persisted session
   and profile are valid.
5. A profile request timeout or network error never routes an existing user to
   Onboarding.
6. Onboarding is shown only when a successful profile query confirms that no
   profile exists.
7. Public legal and support routes retain their current unauthenticated access.
8. Cached feature data remains visible during background refresh failures where
   the relevant screen already has usable data.
9. The offline and retry UI is accessible to screen readers and clearly reports
   retry progress.
10. Automated tests cover unresolved promises as well as ordinary resolved and
    rejected requests.

## Verification notes

The existing focused auth-boundary and data-hook suites pass: 2 suites and 36
tests. They cover successful and rejected requests but do not cover offline
connectivity, a never-settling request, an auth/profile timeout, or retrying the
global gate. Those missing cases are the required regression coverage for this
fix.

No application code or Linear issue state was changed as part of this
investigation document.
