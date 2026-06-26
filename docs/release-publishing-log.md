# Release Publishing Log

## Purpose

Record every meaningful step, decision, error, fix, and result while preparing Revit for App Store and Play Store submission.

This file is intentionally practical. Treat it like a build diary that can later become:

- a blog post about publishing a React Native / Expo app
- a reusable Codex skill for end-to-end mobile app publishing
- a checklist for future Revit releases

## Logging Rules

For every attempt, add:

- date and time
- goal
- exact action taken
- command or dashboard path used
- result
- error text or screenshot reference if something failed
- fix or next action

Do not store secrets, API keys, service account JSON, keystore files, Apple credentials, or private tokens in this repo.

## Current Release Direction

Status: Phase 8 hardening, entering release-build preparation.

Launch auth decision:

- Android: Google sign-in.
- iOS: Google sign-in and Apple Sign-In.
- Email OTP / magic link: hidden for v1 launch.

Accepted v1 tradeoffs:

- Supabase-hosted Google OAuth may show the Supabase project domain.
- Full Supabase custom domain branding is deferred because it requires a paid Supabase custom domain/add-on.
- Resend SMTP is deferred until production email auth is re-enabled.

## Timeline

### 2026-06-23: Phase 8 Auth Scope Reduced

Goal:

- Reduce launch auth risk and avoid production email requirements before a sending domain is ready.

Actions:

- Added `EMAIL_AUTH_ENABLED_FOR_LAUNCH = false`.
- Hid the Email OTP / magic-link entry point from the welcome screen.
- Guarded `/email-code` so direct navigation redirects to `/welcome`.
- Deferred TAR-73 and email templates until a verified sending domain is available.

Result:

- TypeScript passed.
- Lint passed.
- Launch auth is now Google on Android and Google + Apple on iOS.

Next action:

- Continue with release-build setup and platform auth verification.

### 2026-06-23: Android Package Name Added

Goal:

- Set the permanent Android app identifier before release builds and Play Store setup.

Action:

- Added Android package name in `app.json`:

```text
com.tarun.revit
```

Result:

- TypeScript passed.
- Lint passed.

Notes:

- This package name should not change after publishing to Google Play.

### 2026-06-23: EAS Release Build Configuration Added

Goal:

- Create a repeatable EAS build setup for internal testing, Play Store AAB uploads, and iOS TestFlight/App Store builds.

Actions:

- Added `eas.json`.
- Added iOS build number:

```text
ios.buildNumber = 1
```

- Added Android version code:

```text
android.versionCode = 1
```

- Added iOS export compliance config:

```text
ios.config.usesNonExemptEncryption = false
```

- Added git ignore rules for Play Store service account files, Apple API key files, Android keystores, and Java keystores.
- Added Android blocked permission:

```text
android.permission.RECORD_AUDIO
```

Reason:

- The public Expo config surfaced `RECORD_AUDIO`, but Revit does not record audio.
- Keep Play Store permissions and privacy declarations as small and accurate as possible.

Profiles added:

```text
development: internal development-client build
preview: internal Android APK build
production: Android AAB and iOS production/TestFlight build
```

Decision:

- Use APK only for quick/internal testing.
- Use AAB for Play Store publishing.
- Submit Android production builds to the Play internal track first, as draft, before any public release.

Next action:

- Run local config validation.
- Initialize/link the project with EAS if needed.
- Build Android preview first before attempting production AAB.

Validation:

- `npx expo config --type public` passed.
- Public config still lists `RECORD_AUDIO` under generated Android permissions while also showing it under `blockedPermissions`.
- Verify the final generated Android manifest or EAS build artifact to confirm the permission is removed from the actual build.
- `npm run typecheck` passed.
- `npm run lint` passed.

### 2026-06-23: Domain Purchased

Goal:

- Buy a reusable domain for future support, landing pages, email sending, and possible auth branding.

Action:

- Purchased:

```text
tarunapps.com
```

Result:

- Domain is active in Cloudflare.

Decision:

- Do not use Supabase custom auth domain for v1 unless paid Supabase custom domain support is chosen.
- Keep `tarunapps.com` for support/legal pages, Resend/email later, and future apps.

### 2026-06-25: Expo Account Login Confirmed

Goal:

- Confirm which Expo account local EAS commands will use before creating or building the Revit project.

Action:

- Ran:

```text
npx eas-cli@latest whoami
```

Result:

- Local machine is logged into Expo as:

```text
tarun495
mt790191@gmail.com
```

Notes:

- The command printed a Node.js `punycode` deprecation warning.
- The warning did not block the account check.
- No build, publish, upload, or config change was performed.

Next action:

- Confirm whether an Expo project already exists for Revit or initialize/link this repo to an Expo EAS project before the first preview build.

### 2026-06-25: EAS Project Link Check Failed

Goal:

- Check whether the local Revit repo is already linked to an Expo/EAS project.

Action:

- Ran:

```text
npx eas-cli@latest project:info
```

Result:

- The command failed because no EAS project is configured for this repo yet.

Error:

```text
EAS project not configured.
Must configure EAS project by running 'eas init' before this command can be run in non-interactive mode.
Error: project:info command failed.
```

Notes:

- The command also printed a Node.js `punycode` deprecation warning.
- The warning was not the cause of the failure.
- No build, publish, upload, or app-store action was performed.

Next action:

- Run `npx eas-cli@latest init` only after approval to create or link the Expo/EAS project for Revit.

### 2026-06-25: EAS Project Created And Linked

Goal:

- Create or link the Revit repo to an Expo/EAS project under the confirmed Expo account.

Action:

- Ran:

```text
npx eas-cli@latest init
```

- Accepted the prompt:

```text
Would you like to create a project for @tarun495/revit? yes
```

Result:

- Created Expo project:

```text
@tarun495/revit
https://expo.dev/accounts/tarun495/projects/revit
```

- Linked project ID:

```text
1e3b3312-1672-4370-8fc7-20ca5f53718a
```

- EAS modified `app.json`.

Verification:

- Ran:

```text
npx eas-cli@latest project:info
```

- Confirmed:

```text
fullName  @tarun495/revit
ID        1e3b3312-1672-4370-8fc7-20ca5f53718a
```

Notes:

- The command printed a Node.js `punycode` deprecation warning.
- The warning did not block project creation or linking.
- No build, publish, upload, or app-store action was performed.
- `app.json` now includes `expo.owner = tarun495` and `expo.extra.eas.projectId`.
- `app.json` also currently includes an explicit Android `permissions` entry for `android.permission.RECORD_AUDIO`, even though `android.blockedPermissions` also blocks it.

Next action:

- Remove the explicit Android `permissions` entry for `android.permission.RECORD_AUDIO` before the first build, then re-run Expo config validation.

### 2026-06-25: Explicit Android Microphone Permission Removed

Goal:

- Remove the explicit Android `permissions` entry for `android.permission.RECORD_AUDIO` before the first EAS build.

Action:

- Removed this explicit block from `app.json`:

```text
android.permissions = ["android.permission.RECORD_AUDIO"]
```

Result:

- `app.json` still keeps:

```text
android.blockedPermissions = ["android.permission.RECORD_AUDIO"]
```

- Ran:

```text
npx expo config --type public
```

- Expo config validation completed successfully.

Notes:

- The public Expo config still shows `android.permission.RECORD_AUDIO` under generated Android permissions while also showing it under `blockedPermissions`.
- This suggests the permission is still contributed by the Expo/native config layer, but should be removed from the final generated Android manifest by `blockedPermissions`.
- Verify the final generated Android manifest or EAS build artifact before Play Store submission.
- The command also printed an experimental `EnvHttpProxyAgent` warning; it did not block config validation.

Next action:

- Before building, decide whether to run one more local validation command or proceed to the first Android preview APK build.

### 2026-06-25: Supabase Redirect URL State Reviewed During First APK Build

Goal:

- Check whether Supabase Auth redirect URLs are ready for Expo Go, web testing, and the upcoming Android APK.

Observed dashboard state:

- Supabase Authentication > URL Configuration > Redirect URLs currently includes:

```text
revit://callback
exp://192.168.1.21:8081/--/callback
exp://192.168.1.21:8081/**
```

Notes:

- `revit://callback` is the important redirect for installed APK and production app testing.
- The `exp://...` entries are for Expo Go and depend on the current local network IP.
- A previous dashboard view showed the Site URL using `exp://192.168.1.39:8081`, while Redirect URLs currently show `exp://192.168.1.21:8081`. If the phone or dev server IP changes, Expo Go auth can fail until the matching URL is added.
- Browser/web testing also needs a localhost redirect URL if web auth testing is still required.

Next action:

- If APK Google login fails, compare the exact redirect URL generated by the app against the Supabase allow-list before changing broader auth settings.

### 2026-06-25: First Android Preview APK Build Failed

Goal:

- Build the first Android preview APK for direct device testing.

Action:

- Ran:

```text
npx eas-cli@latest build -p android --profile preview
```

Result:

- Build failed during the Gradle `Run gradlew` phase.

Error:

```text
Execution failed for task ':app:createBundleReleaseJsAndAssets'.
Process 'command '/home/expo/workingdir/build/node_modules/react-native/sdks/hermesc/linux64-bin/hermesc'' finished with non-zero exit value 2
Gradle build failed with unknown error.
```

Notes:

- This failed while creating the release JavaScript bundle/assets, before any APK was produced.
- This was not a Play Store upload or publishing failure.
- Need the detailed `Run gradlew` logs or a local reproduction to identify the underlying JavaScript/Hermes bundle error.

Next action:

- Reproduce the Android production bundle locally with Expo export or collect the detailed EAS `Run gradlew` phase logs.

### 2026-06-25: Local Android Export Reproduction Blocked By Windows Spawn Error

Goal:

- Reproduce the EAS JavaScript production bundling failure locally.

Action:

- Ran:

```text
npx expo export --platform android
```

Result:

- Local export first failed while trying to remove an existing generated `dist` file:

```text
EPERM: operation not permitted, unlink 'D:\Files\Projects\Revit\dist\callback.html'
```

- Retried with a separate output directory:

```text
npx expo export --platform android --output-dir .expo-export-android
```

- That failed before reaching the app bundle error:

```text
Failed to construct transformer: Error: spawn EPERM
```

Notes:

- This local failure appears to be a Windows process/file permission issue, not necessarily the same JavaScript/Hermes failure from EAS.
- The EAS dashboard identified the failed build as a JavaScript bundling error and advised checking earlier logs in the `Run gradlew` phase.

Next action:

- Inspect the earlier red/error lines in the EAS `Run gradlew` phase above the Hermes `exit value 2` message, or retry local export from a terminal that can spawn Metro worker processes successfully.

### 2026-06-25: Supabase Hermes Bundle Failure Root Cause Found And Fix Applied

Goal:

- Identify and fix the JavaScript/Hermes bundling error that caused the first Android preview APK build to fail.

Evidence:

- Local Android export reached Hermes bytecode generation and reported:

```text
Failed to generate Hermes bytecode
error: Invalid expression encountered
if (otelModulePromise === null) otelModulePromise = import(... OTEL_PKG).catch(() => null);
```

Root cause:

- The app was importing the ESM build of `@supabase/supabase-js@2.106.1`.
- That published ESM bundle includes a disabled-by-default OpenTelemetry tracing helper with a dynamic `import(...)` expression.
- Hermes still parses the bundled code during release bytecode generation and rejects that expression, even though tracing is not enabled.

Fix:

- Updated `lib/supabase/client.ts` to import Supabase from the CommonJS build:

```text
@supabase/supabase-js/dist/index.cjs
```

- Kept the public Supabase client API and existing auth/storage options unchanged.

Validation:

- `npm run typecheck` passed.
- `npm run lint` passed.

Next action:

- Re-run `npx expo export --platform android` from a terminal that can complete the local export, then retry the Android preview APK build if export passes.

### 2026-06-25: Android Export Passed After Supabase Bundle Fix

Goal:

- Verify locally that the Android production JavaScript/Hermes export succeeds after switching Supabase to its CommonJS build.

Action:

- Ran:

```text
npx expo export --platform android
```

Result:

- Export passed and produced:

```text
android bundles (1):
_expo/static/js/android/entry-b01d98d74fdadcf6b7f77e5aa1e7be04.hbc (5.23 MB)

Files (1):
metadata.json (3.03 kB)

Exported: dist
```

Notes:

- This confirms the previous Hermes `Invalid expression encountered` error is fixed locally.
- Generated `dist` output is not intended to be committed.

Next action:

- Retry the Android preview APK build with EAS.

### 2026-06-25: Android Preview APK Build Succeeded

Goal:

- Build an Android preview APK for direct device testing after fixing the Supabase/Hermes bundling failure.

Action:

- Ran:

```text
npx eas-cli@latest build -p android --profile preview
```

Result:

- Build finished successfully.
- Build artifact type:

```text
APK
```

- Build profile:

```text
preview
```

- App version:

```text
1.0.0 (1)
```

- Commit shown by EAS:

```text
fe9a9b1
```

- Build timing:

```text
Queue time: 19m 41s
Build time: 17m 8s
Total time: 36m 58s
```

- APK availability:

```text
13 days
```

Notes:

- This is an internal distribution APK, not a Play Store AAB and not a public release.
- The successful build confirms the Supabase CommonJS import fix works in EAS.

Next action:

- Install the APK on an Android device and run the launch smoke test: app open, Google auth redirect, onboarding/profile routing, hidden email auth, core tabs, and permission prompts.

### 2026-06-25: EAS Upload Ignore Added

Goal:

- Keep EAS build uploads focused on files needed to compile the app.

Action:

- Added `.easignore`.

Result:

- EAS build uploads now exclude local/generated output, logs, docs, agent-only context, temporary scaffold folders, store credential files, and unreferenced draft/reference image assets.

Notes:

- This does not remove docs or reference assets from the repo.
- This does not change which assets are bundled into the installed app; Metro and native config still include only referenced runtime assets.
- Current referenced app assets remain available, including `icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png`, and `favicon.png`.

Next action:

- Later, do a separate asset inventory before store submission to decide which draft/reference images should be deleted, moved, or kept.

### 2026-06-26: Android Preview APK Opens Splash Then Exits

Goal:

- Test the installed Android preview APK on a real device.

Result:

- APK installed successfully.
- On open, the app showed the splash screen and then exited.

Investigation:

- The app creates the Supabase client during startup using:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

- Local `.env` is not committed and is not automatically available to EAS cloud builds.
- `@supabase/supabase-js` throws immediately if `supabaseUrl` is empty:

```text
supabaseUrl is required.
```

Likely root cause:

- The EAS preview APK was built without the required public Supabase environment variables.

Notes:

- Only the public Supabase URL and anon key are needed by the mobile client.
- Do not add service-role keys, database keys, TMDB tokens, Resend keys, or other server secrets to public Expo variables.

Next action:

- Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the Expo/EAS project environment for preview builds, then rebuild the Android preview APK.

### 2026-06-26: Preview Rebuild Failed Because EAS Ignore Excluded App Icons

Goal:

- Rebuild the Android preview APK after adding EAS environment variables.

Result:

- EAS prebuild failed while generating Android icons.

Error:

```text
withAndroidDangerousBaseMod: ENOENT: no such file or directory, open './assets/images/revit-android-icon-foreground.png'
```

Root cause:

- `.easignore` excluded `assets/images/revit-android-icon-*.png`.
- `app.json` references these `revit-*` icon files for the Android adaptive icon, so EAS needs them during prebuild.

Fix:

- Updated `.easignore` to allow the referenced runtime icon assets:

```text
assets/images/revit-app-icon.png
assets/images/revit-android-icon-foreground.png
assets/images/revit-android-icon-background.png
assets/images/revit-android-icon-monochrome.png
```

- Kept unused draft/reference assets ignored.

Validation:

- `npx expo config --type public` passed and resolved the `revit-*` icon paths.

Next action:

- Retry the Android preview APK build.

## Upcoming Attempts

### EAS Build Setup

Goal:

- Configure production-like Android and iOS builds.

Planned actions:

- Add `eas.json`.
- Add iOS `buildNumber`.
- Add Android `versionCode`.
- Configure production Android builds as AAB for Google Play.
- Configure internal/development builds for testing.

Expected output:

- A repeatable EAS build setup that can produce:
  - Android internal APK/dev build for testing
  - Android production AAB for Play Store
  - iOS production/TestFlight build

### Play Store First Submission

Goal:

- Publish to Google Play internal testing first, not direct production.

Planned actions:

- Create app in Google Play Console.
- Complete store listing.
- Complete app content declarations.
- Complete content rating.
- Set pricing/distribution.
- Build Android AAB.
- Upload/submit to internal testing.

Known warnings:

- New Play Store apps require AAB, not APK, for production publishing.
- APK builds are useful for local/internal testing, but not enough for final Play Store submission.
