# Revit Play Store assets — v1.3 package

## Files

- `graphics/play-store-icon-512.png` — 512 × 512 PNG copied from the approved
  Ribbon R source: `assets/images/revit-ribbon-play-store-icon.png`.
- `graphics/feature-graphic-1024x500.png` — 1024 × 500 PNG built from the
  approved Ribbon R app-icon source. Its only text is `Revit` and `Your
  entertainment journal`; it makes no feature claim.
- `phone-screenshots/*.png` — five 1080 × 1920 PNG candidates: Discover, Title
  Details, Journal Timeline, Planner, and Lists.

## Capture provenance and release gate

The phone candidates preserve the real UI from their named files in
`publish-screenshots/`; they were proportionally placed on the required 1080 ×
1920 canvas without invented interface or generated content. Their source
captures predate the final v1.3 release review. They are therefore **not
approved for upload yet**.

Before using these images in Play Console, capture the same five flows from the
reviewed `1.3.0` Android build on a 1080 × 1920 device/emulator, then replace
only the corresponding candidate after visual comparison. In particular,
confirm the current Discover subheading and the v1.3 Help & Feedback route.

Games are deliberately absent. The production capability fails closed unless
the server owner enables it, and TAR-178 records outstanding production gates.
Do not add Game screenshots or game claims until Tarun has approved production
Games enablement and its licensing/compliance gates are recorded complete.
