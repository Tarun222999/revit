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

## Production Email Delivery Uses Supabase Built-In Email

Status: open
Severity: release blocker
Area: authentication, email delivery

Issue:

Supabase's built-in email service is being used for OTP and magic-link emails during development. This service has rate limits and is not intended for production app email delivery.

Current workaround:

- Acceptable for Phase 1 development/testing.
- Rate limits may interrupt repeated local auth testing.

Release requirement:

- Configure custom SMTP before release.
- Verify deliverability for auth emails.
- Verify sender name, sender address, and reply-to behavior.

## Auth Email Templates Are Plain And Unbranded

Status: open
Severity: release blocker
Area: authentication, email UX

Issue:

Current Supabase auth email templates are plain and do not reflect the Revit product identity. Production auth emails should look intentional, trustworthy, and consistent with the app.

Current workaround:

- Plain templates are acceptable for Phase 1 testing.
- The template currently supports both magic link and OTP token testing.

Release requirement:

- Create branded Revit email templates for OTP and magic link.
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
