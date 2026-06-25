# React Native Publishing Playbook Draft

## Working Title

Publishing an Expo React Native App to Google Play and the App Store: A Real Release Log

## Purpose

This draft captures the end-to-end publishing process while Revit moves from a working Expo app to store-submission readiness.

The goal is to document the real path, including confusing dashboard steps and failed attempts, so the final output can become:

- a practical blog post
- a future Codex skill
- a reusable app-release checklist

## Source Of Truth While Working

Use `docs/release-publishing-log.md` as the live diary.

After each major step, copy the distilled lesson here.

## Target Audience

Developers who can build a React Native app but get stuck around:

- EAS builds
- Play Store Console setup
- App Store Connect setup
- OAuth/auth redirects
- signing credentials
- app identifiers
- version codes/build numbers
- internal testing tracks
- privacy declarations

## Current App Context

App:

```text
Revit
```

Stack:

- Expo
- React Native
- TypeScript
- Supabase Auth/Postgres/Storage/Edge Functions
- EAS Build

Launch auth:

- Android: Google
- iOS: Google and Apple
- Email OTP / magic link deferred

App identifiers:

```text
iOS bundle identifier: com.tarun.revit
Android package name: com.tarun.revit
```

Domain:

```text
tarunapps.com
```

## Chapter Outline

### 1. Before Publishing: Lock The App Identity

Topics:

- app name
- bundle identifier
- Android package name
- app scheme
- version and build numbers
- why changing identifiers later is painful

### 2. Decide The Launch Auth Surface

Topics:

- Google on Android
- Google + Apple on iOS
- why email auth was deferred
- why Supabase hosted OAuth may show the Supabase project domain
- custom domains versus native sign-in
- documenting accepted launch tradeoffs

### 3. Configure EAS Builds

Topics:

- `eas.json`
- development/internal/production profiles
- AAB versus APK
- version code and build number
- local testing versus store submission

### 4. First Android Build

Topics:

- creating a development/internal build
- expected commands
- where build artifacts appear
- common failures and fixes

### 5. Google Play Console Setup

Topics:

- creating the app manually
- package name
- app content declarations
- privacy policy/support contact
- content rating
- internal testing track
- why first publishing is more than uploading an APK

### 6. First Play Store Internal Test

Topics:

- building AAB
- uploading/submitting
- testers
- review/pre-launch reports
- fixing rejected or blocked submissions

### 7. iOS/TestFlight Setup

Topics:

- Apple Developer account
- bundle identifier
- Sign in with Apple capability
- EAS credentials
- TestFlight build
- App Store review basics

### 8. Final Submission Checklist

Topics:

- auth verified
- delete account verified
- legal/support links verified
- screenshots
- privacy disclosures
- release notes
- staged rollout

## Skill Idea

Future skill name:

```text
publish-expo-app
```

Future trigger:

- user wants to publish an Expo/React Native app
- user is stuck with EAS builds
- user needs Play Store or App Store submission help
- user wants a launch checklist

Future resources:

- `references/play-store.md`
- `references/app-store.md`
- `references/eas-build.md`
- `references/auth-release.md`
- `templates/release-log.md`

Do not create the final skill until the real Revit release path has been completed at least once.

