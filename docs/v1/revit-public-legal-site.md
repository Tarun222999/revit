# Revit Public Legal And Support Site Draft

## Purpose

Create a simple public website for Revit legal and support pages so app store listings can link to stable URLs.

Expected public paths:

- `https://tarunapps.com/revit/privacy`
- `https://tarunapps.com/revit/support`
- `https://tarunapps.com/revit/terms`

## Site Scope

The site should be static and public.

It should not include:

- user accounts
- forms
- analytics
- tracking scripts
- advertising scripts
- database access
- third-party API calls

## Deployment Direction

The simplest deployment path is Cloudflare Pages serving static files.

Deployment should happen only after the page copy is reviewed and approved.

If Cloudflare authentication is required, use a safe logged-in CLI or connector flow. Do not paste Cloudflare passwords, API tokens, private keys, or other secrets into chat.

## Source Material

The public page copy should be based on the current in-app legal and support text in:

- `features/legal/data/legalDocuments.ts`

Current in-app updated date:

- `June 14, 2026`

## Current Product Facts To Preserve

- Revit is a personal entertainment journal for movies, series, and anime.
- Games are architecturally planned but deferred from v1 public launch.
- Android launch auth is Google login.
- iOS launch auth is Google login and Sign in with Apple.
- Email OTP / magic link is hidden or dormant for v1.
- Revit uses Supabase Auth, Supabase Postgres, Supabase Storage, and Supabase Edge Functions.
- Revit stores profile, journal, list, list item, and avatar data.
- Revit uses TMDB-backed metadata for movies, series, and anime.
- Revit does not currently include ads.
- Revit does not currently include analytics or crash reporting.
- The public site should not imply social features, public profiles, comments, likes, or recommendation features for v1.

## Draft Page Structure

### Privacy Policy

Recommended sections:

- Overview
- Information Revit Stores
- Authentication And Account Data
- Journal, Lists, And Reviews
- Avatars And Storage
- Media Metadata
- How Data Is Used
- Ads, Analytics, And Tracking
- Data Sharing
- Data Deletion
- Children
- Changes
- Contact

### Support

Recommended sections:

- Getting Help
- What To Include In A Support Request
- Account And Data Requests
- Metadata Issues
- Security Reminder

### Terms Of Use

Recommended sections:

- Use Of Revit
- Accounts
- User Content
- External Metadata
- Availability
- App Store And Platform Terms
- Changes
- Contact

## Open Questions Before Publishing

1. Public support email: `mt790191@gmail.com`
2. Use the public site publication date as the visible `Last updated` date. For the first public draft, use `June 27, 2026`.
3. Include a small `/revit` landing page that links to Privacy, Terms, and Support.

## Approval Status

Plan approved by the project owner on June 27, 2026.

## Step-By-Step Completion Plan

### Step 1: Finalize This Plan

Review this document and confirm the basic direction:

- static public site
- Cloudflare Pages deployment
- public paths under `https://tarunapps.com/revit`
- no tracking, login, forms, database, or backend calls

Also confirm the open questions above before publishing.

### Step 2: Draft The Public Copy

Create reviewable Markdown copy for:

- Privacy Policy
- Terms of Use
- Support

The copy should be based on `features/legal/data/legalDocuments.ts`, but polished for public app store use.

### Step 3: Create Static Site Files

After the copy is approved, create the public static website files.

Likely structure:

```text
public-site/
  revit/
    index.html
    privacy/
      index.html
    terms/
      index.html
    support/
      index.html
    styles.css
```

The `/revit` index page should be a small legal/support landing page if approved.

### Step 4: Preview Locally

Open the static pages locally and verify:

- copy reads cleanly
- pages work on mobile-sized screens
- links between pages work
- there are no tracking scripts
- there are no backend calls
- the site does not require login

### Step 5: Prepare Cloudflare Pages Configuration

Add only the minimal configuration needed for static hosting.

Possible files:

- `_headers`
- `_redirects`
- Cloudflare Pages project notes

Do not add secrets or environment variables for this site.

### Step 6: Review Before Deployment

Review and approve:

- Privacy Policy copy
- Terms of Use copy
- Support copy
- public support contact
- final URLs
- deployment target

No deployment should happen before this approval.

### Step 7: Deploy To Cloudflare Pages

Deploy the static site to Cloudflare Pages only after approval.

If Cloudflare authentication is required:

- use a safe logged-in CLI or connector flow when available
- otherwise prepare exact Cloudflare UI steps for the user
- do not ask for Cloudflare passwords, API tokens, private keys, or other secrets in chat

### Step 8: Verify Live URLs

After deployment, verify these pages load publicly:

- `https://tarunapps.com/revit/privacy`
- `https://tarunapps.com/revit/terms`
- `https://tarunapps.com/revit/support`

If a `/revit` landing page is included, verify:

- `https://tarunapps.com/revit`

### Step 9: Use URLs In Store Metadata

After live verification, use the public URLs in app store setup:

- Play Store privacy policy URL
- Play Store support/contact URL if needed
- App Store privacy/support fields when preparing iOS release

Do not upload builds, submit Play releases, or run production EAS builds from this thread.

## Next Step

After this Markdown plan is approved, draft the public Privacy Policy, Terms of Use, and Support copy in Markdown for review.
