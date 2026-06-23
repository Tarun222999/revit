# Release Blockers

## Purpose

This document tracks issues that do not necessarily block local development, but must be resolved before production release or store submission.

Future agents should add to this file when they discover a production-readiness issue, especially if the issue is outside the immediate implementation phase.

## How To Use This File

When adding an item, include:

- status
- severity
- phase or owner area
- why it matters
- current workaround, if any
- release requirement

Use this shape:

```text
## Title

Status:
Severity:
Area:

Issue:

Current workaround:

Release requirement:
```

## OAuth Consent Branding Shows Supabase Project Domain

Status: open
Severity: release blocker
Area: authentication, branding
Linear: TAR-93

Issue:

Google sign-in currently shows users that they are continuing to the Supabase project domain:

```text
vhwjlxmqjgeedldinonz.supabase.co
```

This feels unbranded and may look suspicious to users. The production auth experience should clearly present Revit as the app requesting sign-in.

Current workaround:

- Acceptable during development while Google auth is being tested through Supabase OAuth.

Release requirement:

- Configure Google OAuth consent branding so the consent flow clearly shows Revit.
- Review Supabase custom domain options for auth before release.
- Verify the final Google consent screen on mobile and web before submission.
- Complete this during Phase 8 before final auth verification and before Phase 9 screenshots/release builds.

## Production Email Delivery Uses Supabase Built-In Email

Status: deferred
Severity: post-domain follow-up
Area: authentication, email delivery
Linear: TAR-73

Issue:

Supabase's built-in email service is available for OTP and magic-link emails during development. This service has rate limits and is not intended for production app email delivery.

The v1 launch auth plan now hides Email OTP / magic link because there is no verified sending domain available for Resend/custom SMTP yet.

Current workaround:

- Email auth remains implemented in the codebase but hidden behind a launch flag.
- Android launch auth uses Google.
- iOS launch auth uses Google and Apple.

Release requirement:

- Not required for the no-email v1 launch path.
- Before enabling Email OTP / magic link for users, buy/use a domain, configure Resend/custom SMTP, verify deliverability, and verify sender name, sender address, and reply-to behavior.

## Auth Email Templates Are Plain And Unbranded

Status: deferred
Severity: post-domain follow-up
Area: authentication, email UX

Issue:

Current Supabase auth email templates are plain and do not reflect the Revit product identity. Production auth emails should look intentional, trustworthy, and consistent with the app before Email OTP / magic link is exposed to users.

Current workaround:

- Email auth is hidden for v1 launch.
- Plain templates remain acceptable only for local/development testing while email auth is dormant.

Release requirement:

- Not required for the no-email v1 launch path.
- Before enabling Email OTP / magic link for users, create branded Revit email templates for OTP and magic link.
- Include clear copy, app name, support/contact context, expiration wording, and safe fallback text.
- Verify templates on mobile and desktop email clients.

## Temporary Expo Go Site URL Configuration

Status: open
Severity: development-only blocker if forgotten
Area: authentication, environment configuration

Issue:

For Expo Go Google auth testing, the Supabase Site URL was temporarily changed to an Expo development callback URL:

```text
exp://192.168.1.21:8081/--/callback
```

This is useful for local mobile testing but is not a production-safe configuration and can break web testing redirects.

Current workaround:

- Keep this only while testing Google auth in Expo Go.
- Use Additional Redirect URLs for environment-specific callback URLs where possible.

Release requirement:

- Replace Site URL with the final production URL before release.
- Keep only appropriate production redirect URLs.
- Remove stale local IP redirect URLs before release.

## Apple Sign-In Needs Production-Like iOS Verification

Status: open
Severity: release blocker
Area: authentication, iOS release readiness

Issue:

Native iOS Apple sign-in code has been added and the Supabase Apple provider has been enabled, but the flow has not yet been verified on a supported iOS device or iOS dev/release build with the Apple Sign-In capability.

Current workaround:

- Android and web hide native Apple sign-in.
- Email and Google auth are available for current development testing.

Release requirement:

- Verify Apple sign-in on a real iOS device or production-like iOS build.
- Confirm the configured bundle identifier matches Apple Developer and Supabase Client IDs.
- Confirm Apple sign-in creates or resumes the correct Supabase user session.
- Confirm Apple users without a profile route to onboarding and users with profiles route home.
