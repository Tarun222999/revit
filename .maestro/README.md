# Revit Maestro smoke flows

These flows are intentionally small and use visible text so they exercise the app the way a user does.

## Requirements

- Maestro CLI
- A built Revit Android or iOS app installed on a simulator/device
- `MAESTRO_APP_ID` set to the platform identifier:
  - Android: `com.tarun.revit`
  - iOS: `com.tarun.revit`

The public flows only need the app's unauthenticated state. The authenticated navigation flow requires a test account that has completed onboarding; it does not automate Google, Apple, or email-code delivery.

## Run

From the repository root:

```text
maestro test -e MAESTRO_APP_ID=com.tarun.revit .maestro
```

Run one flow while developing:

```text
maestro test -e MAESTRO_APP_ID=com.tarun.revit .maestro/email-validation.yaml
```

The Maestro CLI and an installed simulator/device are not currently available in this workspace, so these flows have been added but not executed here.

## Current coverage

- `public-auth-and-legal.yaml`: launch, Terms, Privacy Policy, and the public Support deep link
- `email-validation.yaml`: email auth navigation and invalid-email validation
- `authenticated-navigation.yaml`: tab access and empty list-form validation with an existing session

Search-to-title-details and journal-entry modal flows should be added once a stable test media fixture or seeded test account is available.
