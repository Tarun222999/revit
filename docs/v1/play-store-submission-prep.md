# Play Store Submission Prep

## Purpose

Prepare Play Store submission materials while Google Play Console account verification is pending.

This document is a draft workspace only. Do not paste into Play Console, upload builds, or submit a release from this document until the user explicitly approves that step.

## Current Scope

Status: draft only

Current lane:

- Prepare metadata and answers ahead of time.
- Keep Android release path focused on internal testing first.
- Do not run production EAS builds from this prep step.
- Do not upload APK/AAB files from this prep step.
- Do not submit anything to Google Play while developer account verification is pending.

Known launch context:

- App name: Revit
- Android package: `com.tarun.revit`
- Launch auth on Android: Google login
- Launch auth on iOS: Google login and Apple Sign-In
- Email OTP / magic link: hidden/dormant for v1
- Launch media focus: movies, series, and anime
- Games: deferred to v1.1
- Ads: none planned for v1
- Analytics/crash reporting: none currently installed

## Step 1: Draft Store Listing Copy

### App Category

Recommended primary category:

```text
Entertainment
```

Reason:

Revit is centered on movies, series, and anime. It is not a productivity tool, social network, or media streaming app.

Secondary positioning for copy:

```text
Personal entertainment journal
```

### Tag Candidates

Use only if Play Console offers matching tags. Final selection should be based on the exact tags available in the dashboard.

Candidate tags:

- Movies
- TV
- Anime
- Entertainment
- Lists

Avoid positioning:

- Streaming
- Social networking
- Reviews aggregator
- Recommendations
- Games

Reason:

Revit tracks and organizes entertainment. It does not stream content, publish social reviews, or launch with game catalog support.

### Short Description

Recommended draft:

```text
Track movies, series, and anime in your personal entertainment journal.
```

Backup draft:

```text
A personal journal for tracking movies, series, anime, ratings, and lists.
```

Notes:

- Keep this direct and functional.
- Avoid overclaiming discovery, recommendations, or streaming.
- Do not mention games for v1.

### Full Description

Recommended draft:

```text
Revit is a personal entertainment journal for keeping track of the movies, series, and anime you want to watch, are currently watching, have completed, or decided to drop.

Search for a title, add it to your journal, set a status, give it a rating, and write a short review for your own record. Revit keeps the focus on your private watching history, not a public social feed.

Use Revit to:

- Search movies, series, and anime
- Save titles to your personal journal
- Track statuses like planned, in progress, completed, and dropped
- Rate titles on a simple 0.5 to 5.0 scale
- Write short reviews with optional spoiler marking
- Browse your journal in Timeline and Calendar views
- Create mixed-media lists like Favorites, Watch Next, or Best Endings

Revit is built for people who want a clean, personal place to remember what they watched and what they thought about it.

Revit does not stream movies, series, or anime. Title metadata and artwork are used for tracking and organization only.
```

### Contact And Support Wording

Draft support wording:

```text
For support, account questions, privacy requests, or deletion issues, use the official Revit support contact listed on this Play Store page.
```

Recommended final support plan:

- Use the public Revit pages under `revit.tarunapps.com` for privacy, terms, support, and landing page links.
- Use `mt790191@gmail.com` as the support email unless a domain support mailbox is configured and tested later.
- Before Play submission, open each public URL in a normal browser and confirm it loads without authentication.

Final values for Play Console prep:

```text
Support email: mt790191@gmail.com
Privacy policy URL: https://revit.tarunapps.com/revit/privacy/
Terms URL: https://revit.tarunapps.com/revit/terms/
Support URL: https://revit.tarunapps.com/revit/support/
Developer website / landing page URL: https://revit.tarunapps.com/revit/
```

Google Play key URL:

```text
https://revit.tarunapps.com/revit/privacy/
```

### Store Listing Claims To Avoid

Avoid:

- "Watch movies and anime"
- "Stream your favorite shows"
- "Find every title"
- "Personalized recommendations"
- "Track games"
- "Share reviews with friends"
- "Public profile"
- "Works offline"

Reason:

These claims either conflict with v1 scope or imply functionality Revit does not currently ship.

## Remaining Prep Steps

Handle these one at a time after user approval:

1. Screenshot checklist
2. Final blocker review

## Step 2: Draft Data Safety Answers

Status: draft only

Use this as a preparation worksheet before filling the Play Console Data Safety form. Final answers must be checked against the exact current Play Console wording before submission.

### High-Level Answers

Does the app collect or share any required user data types?

```text
Collects data: Yes
Shares data: No, based on current v1 behavior
```

Reason:

Revit stores account, profile, journal, list, review, and optional avatar data to provide the app. The app uses service providers such as Supabase for backend/auth/storage and TMDB-backed metadata integrations, but Revit does not sell data, show ads, or provide user data to advertising/analytics providers in the current v1 setup.

Does the app encrypt data in transit?

```text
Yes
```

Reason:

Supabase and external service calls use HTTPS/TLS.

Can users request data deletion?

```text
Yes
```

Reason:

Revit supports in-app account deletion from Profile / Account. The privacy/support public page should also explain how to request support or deletion help.

Is account creation required?

```text
Yes
```

Reason:

Revit requires login to use private journal, profile, avatar, and list features.

### Data Types To Declare

#### Personal Info

Likely declare:

```text
Email address
User IDs
Name
```

Why:

- Supabase Auth stores the account identifier and provider identity.
- Google login can provide email/name/provider user ID.
- Apple login can provide Apple identity data depending on the user's choice.
- Revit stores display name and username in the app profile.

Purpose:

```text
App functionality
Account management
```

Shared:

```text
No, except processing by service providers needed to operate the app
```

Required or optional:

```text
Required for account setup and app use
```

#### Photos And Videos

Likely declare:

```text
Photos
```

Why:

Users can optionally upload an avatar image.

Purpose:

```text
App functionality
Account management
```

Shared:

```text
No, except storage/serving by the backend provider
```

Required or optional:

```text
Optional
```

Note:

Avatar images may be publicly accessible by direct URL so they can render in the app. This should be disclosed in the privacy policy.

#### App Activity

Likely declare:

```text
App interactions
Other user-generated content
```

Why:

Revit stores journal entries, statuses, ratings, reviews, spoiler flags, completion dates, custom lists, list items, and optional list notes. Depending on Play Console's exact data-type wording, some of this may fit better under "App activity", "User-generated content", or another available category.

Purpose:

```text
App functionality
```

Shared:

```text
No
```

Required or optional:

```text
Required for journal/list features, but individual ratings, reviews, avatars, list notes, and some profile fields are optional
```

#### App Info And Performance

Current draft answer:

```text
Do not declare crash logs, diagnostics, or performance data unless a crash reporting or analytics SDK is added later.
```

Reason:

No analytics or crash reporting package is currently installed.

Verify before final:

- Confirm whether Expo/EAS or platform stores automatically collect any diagnostics outside the app's own code path.
- If Sentry, Firebase Crashlytics, PostHog, Amplitude, Mixpanel, Google Analytics, or similar tooling is added, update this section.

#### Device Or Other IDs

Current draft answer:

```text
Do not declare advertising ID or device IDs unless a dependency or platform service introduces collection.
```

Reason:

Revit does not currently include ads, ad attribution, analytics, or crash reporting SDKs.

Verify before final:

- Confirm final Android manifest and installed SDK list before Play submission.

### Data Types Not Currently Collected

Based on current v1 behavior, do not declare:

- Location
- Contacts
- Calendar
- Health and fitness
- Financial info
- Messages
- Audio files
- Files and docs, except optional avatar photo if Play categorizes image upload separately
- Advertising ID
- Web browsing history
- In-app search history as analytics

### Sharing And Third Parties

Draft position:

```text
Revit does not share user personal data for advertising, analytics, sale, or public social features.
```

Service providers involved in operating the app:

- Supabase: authentication, database, storage, edge functions
- Google / Apple: sign-in providers depending on platform and user choice
- TMDB-backed integrations: title metadata retrieval through server-side integration

Important distinction:

- Third-party service providers process data to operate the app.
- Revit should not mark data as "shared" for advertising or sale unless Play Console's specific definition requires it for a given service-provider flow.

### Safety Notes Before Final Submission

Before entering Play Console Data Safety:

1. Confirm the final privacy policy URL is live: `https://revit.tarunapps.com/revit/privacy/`.
2. Confirm support email is live: `mt790191@gmail.com`.
3. Confirm no analytics/crash reporting SDK has been added.
4. Confirm final Android manifest does not include unexpected sensitive permissions such as `RECORD_AUDIO`.
5. Confirm Email OTP / magic link remains hidden/dormant for v1.
6. Confirm account deletion still works in the release build.

## Step 3: Draft Content Rating Answers

Status: draft only

Use this as a preparation worksheet before completing the Play Console content rating questionnaire under:

```text
Policy > App content > Content rating
```

Google Play assigns content ratings from the questionnaire responses, and different rating authorities may produce different regional ratings. Final answers must match the exact Play Console form shown during submission.

### Recommended App Type / Category

Likely questionnaire category:

```text
Utility, productivity, communication, or other app
```

If Play Console offers a more specific non-game category, choose the closest equivalent for:

```text
Entertainment / lifestyle tracking app
```

Do not choose:

```text
Game
```

Reason:

Revit is an entertainment journal and tracking app. It does not launch games or contain gameplay.

### Core Content Answers

The likely answers for Revit v1 are:

```text
Violence: No
Sexual content or nudity: No
Profanity or crude humor: No
Controlled substances: No
Gambling or contests: No
Real-money purchases or betting: No
Horror/fear content: No
User-to-user communication: No
User-generated content visible to other users: No
Location sharing: No
Digital purchases: No, unless in-app purchases are added later
Ads: No
```

Reason:

Revit stores private journal entries, ratings, reviews, lists, and optional avatars. It does not publish those entries to other users, host public social content, sell items, show ads, or provide mature interactive content.

### Important Nuance: External Entertainment Metadata

Draft position:

```text
Revit displays title metadata and artwork for movies, series, and anime, but does not stream or play that content.
```

Why this matters:

- A movie or anime poster/description could reference mature themes in the source metadata.
- Revit itself does not provide the media content.
- The Play Console form may ask whether the app provides access to content with variable maturity.

Recommended answer if asked whether Revit is a portal for streaming, viewing, or consuming media:

```text
No
```

Reason:

Revit is a tracking/journaling app. It does not let users watch, stream, download, buy, or play the titles.

Recommended answer if asked whether user-visible metadata can include media descriptions:

```text
Yes, the app displays title metadata and artwork for tracking and organization.
```

Follow-up explanation:

```text
The app does not provide playback or access to the underlying movies, series, or anime.
```

### Important Nuance: Private User Reviews

Draft position:

```text
Users can write short private reviews and notes for their own journal/list records.
```

Recommended answer if asked about public user-generated content:

```text
No
```

Reason:

Revit v1 has no public profiles, social feed, comments, likes, user-to-user messaging, or public review publishing.

Recommended answer if asked whether users can create content inside the app:

```text
Yes, but it is private account content used for app functionality.
```

### Target Audience Draft

Recommended target audience:

```text
13 and older
```

Reason:

Revit is not designed specifically for children. It requires an account, stores personal profile/journal data, and displays entertainment metadata for movies, series, and anime, which may include titles intended for older audiences.

Avoid targeting:

```text
Children under 13
```

Reason:

Targeting children would add extra Families policy requirements and would not match Revit's intended audience or account-based journal behavior.

### Expected Rating Direction

Do not promise a final rating before the questionnaire is submitted.

Likely outcome if the form accepts the answers above:

```text
Low/general age rating, possibly with regional variation.
```

Reason:

The app itself has no mature built-in functionality, but regional rating authorities may treat user-created private content, account features, or variable entertainment metadata differently.

### Final Checks Before Content Rating Submission

Before completing the Play Console questionnaire:

1. Confirm the app still has no ads.
2. Confirm the app still has no public user-generated content.
3. Confirm reviews/lists are private to the signed-in user.
4. Confirm there are no in-app purchases or paid features.
5. Confirm the app does not stream, download, or play movies, series, or anime.
6. Confirm screenshots do not show mature poster art or descriptions.
7. Confirm target audience is not set to children under 13.

## Step 4: Draft App Access / Sign-In Details

Status: draft only

Use this as a preparation worksheet before completing Play Console's sign-in details section under:

```text
Policy > App content > Sign-in details
```

Google requires access instructions when all or part of an app is restricted by login credentials, membership, location, or another authentication mechanism.

### Does Revit Require Login?

Recommended answer:

```text
Yes
```

Reason:

Revit requires sign-in to use the app's main private features:

- profile
- avatar
- journal
- ratings
- short reviews
- lists
- account deletion

Unauthenticated users can only see the welcome/auth and public legal/support routes.

### Current Launch Sign-In Methods

Android launch:

```text
Continue with Google
```

iOS launch:

```text
Continue with Google
Sign in with Apple
```

Hidden/dormant for v1:

```text
Email OTP / magic link
```

### Recommended Reviewer Access Strategy

Recommended plan:

```text
Create a dedicated Google reviewer account for Play review after the release build is ready.
```

Do not use:

- the developer's personal Google account
- a shared password stored in the repo
- a temporary account that requires SMS or multi-factor approval during review
- email OTP / magic link for v1 review if the email auth surface remains hidden

Reason:

The reviewer should be able to open the app, tap Continue with Google, authenticate, complete onboarding if needed, and test the app without needing private developer access or extra coordination.

### Reviewer Account Requirements

The reviewer account should:

- be dedicated to app review/testing
- have access to Google sign-in
- not contain personal data
- not require extra approval prompts that Google reviewers cannot complete
- have a simple test profile in Revit
- contain a few harmless sample journal entries and lists if pre-seeding is practical

Suggested account label:

```text
Revit Google Play reviewer account
```

Actual email/password:

```text
Do not store in this repo.
Enter only in Play Console's Sign-in details form when ready.
```

### Draft Instructions For Play Console

Draft reviewer instructions:

```text
Revit requires sign-in because journal, profile, avatar, review, and list data are private to each account.

On Android, tap "Continue with Google" on the welcome screen and sign in with the reviewer Google account provided below.

If onboarding appears, enter a display name and username, then continue into the app.

After sign-in, reviewers can test:
- Discover and Search
- Title Details
- Add/Edit Journal Entry
- Journal Timeline and Calendar
- Lists
- Profile / Account
- Privacy Policy, Terms, Credits, Support
- Sign out
- Delete account flow

Email sign-in is hidden for the v1 launch and should not be used for review.
```

### If A Demo Account Is Not Ready

Fallback plan:

```text
Do not submit for review yet.
```

Reason:

If Google cannot access the app's main authenticated functionality, review can be delayed or rejected.

### Security Notes

Do:

- create a dedicated review account
- keep credentials only in Play Console's app access/sign-in details field
- rotate or disable the account after review if needed
- avoid real personal data in the review account

Do not:

- commit credentials
- paste passwords into docs
- use the developer's personal Google account
- require reviewer coordination outside Play Console

### Final Checks Before App Access Submission

Before filling Play Console sign-in details:

1. Confirm Google login works in the final Android release build.
2. Confirm the reviewer account can sign in without SMS, MFA, or device approval blockers.
3. Confirm a new reviewer account routes through onboarding successfully.
4. Confirm an existing reviewer account routes directly into the app.
5. Confirm the reviewer can test title search, journal entry creation, lists, profile, and account deletion.
6. Confirm Email OTP remains hidden if still deferred for v1.
7. Confirm the supplied credentials are entered only in Play Console, not in repo docs.

## Step 5: Draft Internal Testing Plan

Status: draft only

Use this as the first private Play testing plan after Google Play Console developer account verification clears and the app is ready for an Android AAB upload.

### Track

Recommended track:

```text
Internal testing
```

Do not use for the first Play upload:

```text
Production
Open testing
Closed testing with a larger group
```

Reason:

Revit should get one small, private Play-distributed build first so install, sign-in, permissions, links, and core flows can be checked before any broader release path.

### Platform Scope

Initial scope:

```text
Android only
```

iOS/TestFlight:

```text
Later
```

Reason:

Current Play prep is Android-focused. iOS still needs Apple Sign-In real-device or production-like verification before App Store/TestFlight release prep moves forward.

### Initial Tester List

Initial tester Gmail addresses:

```text
mt790191@gmail.com
tarunkumar.m495@gmail.com
```

Expansion plan:

```text
Start with 1-2 testers.
Expand to 3-5 trusted testers only after the first internal build installs and signs in cleanly.
```

### Known Test Device

Known Android test device:

```text
Motorola Edge 60 Fusion
```

Optional later additions:

- one older Android device
- one smaller screen device
- one Samsung/Pixel-class device if available

### Build Type

For Play internal testing:

```text
Android AAB
```

For direct local/device testing:

```text
APK is fine, but APK is not the Play track release artifact.
```

Do not build or upload the AAB until explicitly approved.

### Tester Instructions Style

Use:

```text
Simple checklist + tiny bug report template
```

### Simple Tester Checklist

Ask testers to check:

```text
1. Install Revit from the Play internal testing link.
2. Open the app.
3. Confirm the splash screen shows the Revit brand mark.
4. Sign in with Google.
5. Complete onboarding if shown.
6. Open Discover.
7. Search for a movie, series, or anime.
8. Open Title Details.
9. Add a title to the journal.
10. Edit the journal entry status, rating, and short review.
11. Open Journal Timeline.
12. Open Journal Calendar.
13. Create or open a list.
14. Add a title to a list if available.
15. Open Profile / Account.
16. Open Privacy Policy, Terms, Credits, and Support links.
17. Sign out and sign back in.
18. Confirm there is no microphone permission prompt.
19. After all other testing is complete, test account deletion if the tester agrees.
```

### Tiny Bug Report Template

Ask testers to send:

```text
Device:
Android version:
Build/version shown:
What you were doing:
What went wrong:
Can you repeat it? Yes/No
Screenshot or screen recording, if easy:
```

Known device example:

```text
Device: Motorola Edge 60 Fusion
```

### Account Deletion Testing

Decision:

```text
Yes, testers can verify account deletion after finishing the rest of the checklist.
```

Important:

- Account deletion should be tested last because it removes the test account's Revit profile, journal, lists, and avatar data.
- Do not ask a tester to delete an account that they still need for additional testing.

### Internal Testing Blockers Before Upload

Do not upload to Play internal testing until these are done or explicitly accepted:

1. Google Play Console developer account verification clears.
2. Privacy/support URLs load publicly.
3. Support email can receive messages.
4. Android release-like AAB is built after explicit approval.
5. Google login works in the release-like Android build.
6. Final Android manifest does not include `android.permission.RECORD_AUDIO`.
7. Data Safety, Content Rating, and App Access drafts are reviewed against the actual Play Console forms.

### Internal Testing Non-Goals

Do not do in this first internal test:

- production release
- open testing
- public announcement
- paid acquisition
- analytics/crash SDK rollout unless separately chosen
- iOS/TestFlight testing
