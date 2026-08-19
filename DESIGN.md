# Revit Visual System

This is the implementation handoff for Revit's established visual language. It
records the system already expressed in `constants/tokens.js`, shared UI
primitives, and the [share-flow preview](docs/v1.2/share-links-preview.html).
It is a reference, not a new product or stack decision.

## Character

Revit feels like a personal screening room and an archive: theatre-black
surfaces, warm parchment copy, poster imagery, and restrained projection-gold
actions. The result should be editorial and calm, never a stock Material
interface. Let media artwork bring most of the colour; the surrounding chrome
should stay quiet and warm.

## Tokens

Use the named NativeWind tokens from `constants/tokens.js` rather than adding
one-off colours.

| Role | Token | Value |
| --- | --- | --- |
| App canvas | `archive-900` | `#0d0b09` |
| Deepest black | `archive-950` | `#060504` |
| Standard surface | `archive-800` | `#171310` |
| Raised / quiet surface | `archive-700` | `#2a211a` |
| Default divider | `archive-700` | `#2a211a` |
| Stronger border | `archive-600` / `archive-500` | `#4a3a2a` / `#6d583e` |
| Primary text | `archive-50` | `#fbf6ec` |
| Supporting text | `archive-300` | `#aa9473` |
| Primary action | `gold-400` | `#d7a94d` |
| Softer gold text / focus | `gold-300` | `#e8c77d` |
| Success / positive state | `teal-500` / `teal-300` | `#4d9188` / `#8bc6bd` |
| Error / destructive state | `reel-500` / `reel-400` | `#b94b3b` / `#d46a55` |
| Warm image fallback | `shelf-700` | `#3a2419` |

Use gold sparingly: a primary action, selected navigation, key metadata, or a
focus outline - not every icon, divider, or card. Teal and reel communicate state
only. Meaning must never rely on colour alone.

The radius scale is deliberately tight: `sm` 6, `md` 8 (the shared
`rounded-app` default), and `lg` 12. Cards, fields, secondary buttons, and
small image containers generally use the 8px app radius; use 12px for larger
editorial groupings or collages. Borders are 1px and warm; elevation is subtle
and dark rather than bright or diffuse.

## Type, layout, and imagery

Use the system sans stack defined in `constants/theme.ts`. Headings are bold,
tight, and high contrast; large editorial headings may use slightly negative
tracking. Supporting copy uses `archive-300`, comfortable line-height, and
plain language. Typical established roles are 12-14px metadata, 14-16px body
and controls, 18-20px section headers, and 24-30px screen headings. Do not
create a separate typeface or a decorative display style without an approved
design decision.

Mobile screens use a generous but compact 20px horizontal inset (`Screen`),
with clear vertical groups rather than dense panels. Preserve space around the
primary action and avoid competing equal-weight buttons. On the web preview,
the same language becomes an editorial board: a restrained dark canvas, thin
dividers, a generous introductory headline, and compact phone-sized examples.

Poster art is content, not decoration: use `object-fit: cover`, warm fallback
surfaces while it loads, and a dark gradient when copy sits over artwork. A
derived collage can represent a mixed-media list; do not invent a separate
illustration system for it.

## Component rules

- `Screen` owns the `archive-900` canvas and the normal 20px screen inset.
- `Card` is `archive-800`, `archive-700` border, 8px radius, and restrained
  padding. Use it to group related content, not as a container for every row.
- Primary buttons are gold with `archive-900` text. Secondary buttons are dark,
  bordered, and use parchment text. Ghost actions are gold text only. Destructive
  actions use reel red. Shared buttons keep a 48px minimum height.
- Fields are dark, bordered, and parchment-led; labels are strong, placeholders
  muted, and validation is reel red. Do not use pale input surfaces in the dark
  experience.
- Section headers use parchment titles, muted subtitles, and a single optional
  gold action. Icons support a label or an accessible name; they do not replace
  important text actions.
- Loading, empty, and error states keep the same bordered dark-card shape.
  Loading uses gold activity; retry is secondary; error uses reel without
  turning the whole screen red.

## Interaction and accessibility

Touch targets should remain comfortably mobile-sized (the shared controls use
at least 44-48px). Keep selected state visible through more than colour: label,
shape, icon, or state treatment as appropriate. Provide a clear gold focus
outline on web, readable labels for icon controls, and layouts that tolerate
larger text. Separate destructive actions from the safe or primary action with
space and hierarchy.

## Sharing reference

The share-flow preview is the reference for public/read-only surfaces. Its
contract is: *a link opens the room, not the diary*. Guests see title or list
content in the established dark world, with a clear shared/read-only cue and a
single calm sign-in invitation to save something to their own Revit account.
The owner's Journal, ratings, notes, and private list notes must not appear.

For a shared list, a live derived-poster cover and compact item rows make the
list feel current; an owner opening the same link returns to the editable list.
Empty, loading, unavailable, and offline states retain the same surface and
privacy posture. In particular, unavailable links should not reveal whether a
private list once existed.

## Source of truth

`constants/tokens.js` and `tailwind.config.js` are the executable colour and
radius source of truth. Shared components in `components/ui/` define the
baseline control treatments. The share-flow preview documents how that system
extends to public web/share contexts. When a new visual need appears, compose
these tokens and patterns first; promote a new token or primitive only when the
need recurs across the product.
