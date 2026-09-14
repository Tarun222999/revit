# Revit Play Store assets — v1.3 package

## Files

- `graphics/play-store-icon-512.png` — 512 × 512 PNG copied from the approved
  Ribbon R source: `assets/images/revit-ribbon-play-store-icon.png`.
- `graphics/feature-graphic-1024x500.png` — 1024 × 500 PNG built from the
  approved Ribbon R app-icon source. Its only text is `Revit` and `Your
  entertainment journal`; it makes no feature claim.
- `phone-screenshots/*.png` — six Play-ready portrait PNG candidates: Discover,
  Title Details, Journal Timeline, Planner, Lists, and Game Details. The first
  five are 1080 × 1920; Game Details is 900 × 1600.

## Capture provenance and release gate

The phone candidates preserve the real UI from their named files in
`publish-screenshots/`; they were proportionally placed on the required 1080 ×
1920 canvas without invented interface or generated content. Their source
captures predate the final v1.3 release review. They are therefore **not
approved for upload yet**.

Before using these images in Play Console, capture the same flows from the
reviewed `1.3.0` Android build on a 1080 × 1920 device/emulator, then replace
only the corresponding candidate after visual comparison. In particular,
confirm the current Discover subheading and the v1.3 Help & Feedback route.

The Game Details candidate preserves the supplied v1.3 capture at its original
770 × 1600 resolution, centred on a black 900 × 1600 canvas so that it meets
Google Play's 9:16 requirement without cropping or inventing interface content.
