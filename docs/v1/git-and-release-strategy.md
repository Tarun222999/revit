# Git And Release Strategy

## Branches

- `main` is the protected release branch.
- `develop` is the protected integration branch.
- Work branches use `feature/*`, `fix/*`, `test/*`, `chore/*`, or `ci/*`.

## Pull Request Flow

1. Create a work branch from `develop`.
2. Open a pull request into `develop`.
3. Let the verification workflow pass.
4. Merge into `develop` after review.
5. Open a release pull request from `develop` into `main`.
6. Merge only after verification passes and the change is ready for a store candidate.

Direct pushes, force pushes, and branch deletion should be disabled for `develop` and `main` in GitHub repository settings.

## Continuous Integration

The `Verify` workflow runs on pull requests and pushes to `develop` and `main`.
It runs:

- `npm ci`
- `npm run verify`
- Expo public configuration validation

The workflow uses Node.js `22.13.0`, matching the current React Native Testing Library requirement.

No EAS build runs for a work branch, pull request, or `develop` push.

## Android Release

The `Android Internal Release` workflow is manually dispatched from `main` only.
It:

1. Builds the production Android artifact with the EAS `production` profile.
2. Optionally submits the latest build to Google Play internal testing.
3. Uses the existing `eas.json` configuration, which keeps the Play release as a draft on the internal track.

The workflow has no Supabase deployment step. Supabase migrations, Edge Functions, and secrets remain outside this release pipeline for now.

## GitHub Settings

Configure these repository protections:

- protect `develop` and `main`
- require the `Verify / verify` status check
- require branches to be up to date before merging
- block force pushes and deletion
- require pull requests for protected-branch changes
- use squash merges for work-branch pull requests
- add a `play-internal` environment with the `EXPO_TOKEN` secret

If this remains a single-maintainer repository, choose the required approval count deliberately: requiring one approval means a second reviewer is needed before protected-branch merges can complete.
