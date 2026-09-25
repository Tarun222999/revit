# Revit store assets

This directory contains the single current, approved store-listing asset set.
Superseded sets are preserved by Git history rather than retained beside the
active files.

## Current approval

- App version: `1.3.0`
- Status: Approved
- Approved: September 25, 2026

## Graphics

- `graphics/play-store-icon-512.png` — 512 × 512 PNG copied from the approved
  Ribbon R source at `assets/images/revit-ribbon-play-store-icon.png`.
- `graphics/feature-graphic-1024x500.png` — 1024 × 500 PNG built from the
  approved Ribbon R app-icon source. Its only text is `Revit` and
  `Your entertainment journal`; it makes no feature claim.

## Screenshots

### Phone

`phone-screenshots/` contains seven approved 1080 × 1920 PNGs:

1. Auth
2. Discover
3. Search
4. Journal
5. Rating
6. Planner
7. Title Details

### 7-inch tablet

`7-inch-tablet-screenshots/` contains six approved 1200 × 1920 PNGs:

1. Auth
2. Discover
3. Search
4. Journal
5. Planner
6. Title Details

### 10-inch tablet

`10-inch-tablet-screenshots/` contains six approved 1600 × 2560 PNGs in the
same order as the 7-inch tablet set.

## Maintenance policy

- Keep only the current approved store-listing assets in this directory.
- Do not create a version folder for every application release.
- Reuse the current images when a release does not materially change the
  represented interface, branding, or store message.
- When replacement captures are approved, replace the superseded files in
  place and update the approval metadata above.
- Keep filenames ordered and descriptive so the intended upload sequence is
  unambiguous.
