# Phase 8 TAR-73: Supabase Resend SMTP Setup

## Goal

Move Supabase Auth email delivery from Supabase's development SMTP service to production-ready custom SMTP through Resend.

Status: deferred until a verified sending domain is available.

TAR-73 is no longer blocking the no-email v1 launch path. Email OTP / magic link should stay hidden for launch until this checklist can be completed with a real domain.

Do this before exposing Email OTP / magic link to production users.

## Required Accounts And Values

Prepare these before changing Supabase settings:

- Resend account access
- A verified sending domain in Resend
- A Resend API key for SMTP auth
- Final sender email, for example `no-reply@your-domain.com`
- Final sender name, recommended: `Revit`
- Final reply-to/support email, if different from the sender

Do not paste API keys into docs, issues, commits, or chat.

## Resend Setup

1. In Resend, add and verify the sending domain.
2. Confirm SPF, DKIM, and DMARC records are valid for the domain.
3. Create an API key for Supabase SMTP usage.
4. Keep the API key available only while entering it into Supabase.

Resend SMTP values:

```text
Host: smtp.resend.com
Port: 465
Username: resend
Password: Resend API key
```

## Supabase Setup

1. Open the Supabase project.
2. Go to Authentication.
3. Open the email/notifications settings.
4. Open SMTP settings.
5. Enable custom SMTP.
6. Enter:
   - Sender email
   - Sender name
   - SMTP host
   - SMTP port
   - SMTP username
   - SMTP password/API key
7. Save the settings.

Recommended Revit values:

```text
Sender name: Revit
Sender email: no-reply@your-domain.com
SMTP host: smtp.resend.com
SMTP port: 465
SMTP username: resend
SMTP password: Resend API key
```

## Verification

After saving Supabase SMTP settings:

1. Send an email OTP to a non-team test address.
2. Confirm the email arrives from the final Revit sender.
3. Confirm the OTP works in the app.
4. Send a magic link to the same test address.
5. Confirm the magic link opens the app callback route correctly.
6. Check Resend logs for successful delivery.
7. Check spam/promotions folders and note any deliverability issue.
8. Test at least one Gmail address and one non-Gmail address if available.

## Completion Criteria

TAR-73 can be marked done when:

- Supabase custom SMTP is enabled.
- Resend is sending Supabase Auth emails.
- OTP delivery and verification work.
- Magic-link delivery and callback work.
- Sender name and sender email are final or explicitly approved for launch.
- No API key is stored in the repo.

## Next Phase 8 Step

After TAR-73 is verified, update Supabase Auth email templates with Revit-branded OTP and magic-link copy before final auth QA.
