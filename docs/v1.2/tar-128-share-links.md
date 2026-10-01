# TAR-128: In-App Share Links for Titles and Lists

## Document Status

- Status: Approved product direction
- Version: v1.2
- Related issue: [TAR-128](https://linear.app/tarun495/issue/TAR-128/share-screens)
- Implementation: Not approved
- Last updated: August 9, 2026

This document defines the approved product scope for sharing Revit title and
list links. It does not authorize code, schema, migration, or tracker changes.
Implementation requires explicit approval and a separate ordered implementation
plan.

## Goal

Let a person share a movie, series, anime, or one of their lists through the
native device share sheet. A recipient who has Revit installed can open the
shared content directly in Revit.

The first version is intentionally app-only:

- no public website or browser fallback
- no social feed, follows, comments, or likes
- no public profile
- no image share cards or rich-link previews

## Decisions Locked Before Implementation

- Title URLs use Revit's existing encoded route-ID contract.
- A shared list is a live read-only view, not a snapshot.
- Opening a shared-list URL as its owner redirects to the normal editable List
  Details route.
- Shared title and list content can be viewed before sign-in; the signed-out
  title path is limited to existing normalized media records and cannot trigger
  a provider fetch.
- Anyone with a valid list link can view it until its owner deletes the list.
  Link revocation and regeneration remain deferred.

## Scope

### Share a title

Title Details includes a `Share` action in its less-prominent actions area. It
shares the route ID already used by Revit's title route, encoded as one path
segment. For example, a TMDB movie source route is:

```text
revit://title/tmdb%3Amovie%3A550
```

The share action must construct the URL as
`revit://title/${encodeURIComponent(createMediaRouteId(item))}`. It must not
invent a shortened `tmdb:550` format. A persisted Revit media-item ID remains
valid when `createMediaRouteId(item)` produces one.

Opening the link shows title information supplied by Revit's normalized media
flow: artwork, title, type, release information, summary, and metadata.

The link identifies the title only. It must never include or reveal information
belonging to the person who shared it, including their Journal state, plans,
watch history, ratings, Notes, reviews, or lists.

### Share a list

List Details includes a `Share` action in its header or overflow actions. It
shares a Revit URL that contains a newly generated, unpredictable share key,
for example:

```text
revit://shared/list/9wQ3...<share-key>
```

The share key is not the list ID. Revit resolves it server-side to one specific
list and returns only the approved read-only fields:

- list name
- list description
- derived cover items and item count
- each item's artwork, title, media type, and normal public metadata needed to
  open its Title Details screen

The shared view does not reveal the list owner's profile, Journal data,
ratings, Notes, review text, or per-item list Notes. The recipient cannot edit
the shared list, reorder it, add to it, or remove from it.

The first version creates one persistent share key per list when it is first
shared. It is a **live view**: later list renames, description edits, and item
adds or removals appear the next time a recipient opens or refreshes the link.
The key stops working if the list is deleted. Link revocation and regeneration
are deliberately deferred; anyone with the link can view the list until then.

Empty lists and default lists are shareable. An empty shared list shows a
read-only `No titles added yet` state. `is_default` does not change the privacy
or sharing rules because the list remains owned by its user.

## Viewer Behavior

The same URL must be useful whether the recipient is signed in or not.

| Viewer | Shared title | Shared list |
| --- | --- | --- |
| Not signed in | Read-only Title Details and a clear `Sign in to save` action. | Read-only shared-list screen and a clear `Sign in to save titles` action. |
| Signed-in recipient | Normal title metadata plus their own Journal and list actions. The sender's data is never shown. | Read-only shared list. Opening an item shows Title Details, where the recipient can add it to their own Journal or lists. |
| Signed-in list owner | Normal Title Details. | The shared URL redirects to the owner's normal editable List Details route. |

Shared routes must be reachable before authentication. Signing in should retain
the current shared destination so that the recipient returns to it afterward.
This applies through every supported sign-in method and, when needed, profile
onboarding. A pending shared destination is cleared only after it has been
restored or the link is invalid.

## Public-Route and Media-Access Contract

Signed-out shared viewing is a first-class delivery requirement.

- `AuthGate` must explicitly allow the shared-list route and title route used
  by a shared URL. It must not redirect a signed-out recipient to Welcome before
  rendering the read-only content.
- The post-auth return behavior must restore the exact title or shared-list
  destination after authentication and onboarding, rather than always routing
  the recipient to the tabs shell.
- A signed-out title request may resolve **only an existing normalized
  `media_items` record**. It must not fetch from TMDB or upsert data.
- If title metadata is unavailable in Revit's stored media catalog, the public
  route shows the same calm unavailable state as an invalid shared link. The
  authenticated title-details flow continues to own TMDB fetching and upsert.
- Creating a title URL must ensure the title has first been persisted through
  the authenticated normalized-media flow, so a valid shared title is available
  to a signed-out recipient without invoking TMDB.
- The public media lookup and shared-list resolver require conservative request
  throttling and return shaped responses only.

## Privacy and Access Rules

- Existing user-owned `lists` and `list_items` access remains private under
  Row Level Security. A recipient must not receive access to the owner's normal
  list rows through the client data API.
- A dedicated, read-only server path resolves a valid list share key and
  returns the reduced shared-list response described above.
- The client must not use a service-role key, broaden list RLS policies, or
  query another user's private list directly.
- Share keys must be generated with cryptographically secure randomness and
  must not be derived from the list ID, owner ID, or creation time.
- Share-key creation must be idempotent: concurrent first-share requests for
  the same list resolve to one persisted key rather than creating several.
- Invalid, deleted, or malformed links show a calm unavailable state and do
  not disclose whether a particular list exists, including when a key points to
  a list that was later deleted.
- The shared-list resolver returns a deliberately shaped DTO. It does not reuse
  an unbounded private-list join and never selects personal Notes, ratings, or
  Journal data.

## User Experience Requirements

- Use the platform-native share sheet on iOS and Android.
- The app must make the shared content clear before opening any sign-in flow.
- Read-only shared lists need a visible context label, such as `Shared list`,
  so recipients do not mistake them for their own editable lists.
- A signed-in recipient may save individual titles to their own Journal or
  lists; this never changes the sender's list.
- Loading, invalid-link, offline, and server-error states must be explicit and
  offer a retry where a retry could help.
- Share actions must have accessible labels and comfortable mobile touch
  targets.

## Technical Direction

- Keep route files thin and put share-specific UI, request logic, and models in
  a focused feature area.
- Use Expo Router for the public-in-app shared routes.
- Use React Native's native share capability; no additional share-card package
  is required for this scope.
- Resolve title metadata through the existing normalized media layer. Do not
  call TMDB directly from the client.
- Use Supabase SQL migrations and generated database types for any persisted
  list share-key record.
- Use a Supabase Edge Function or equivalently constrained server-side path for
  share-key creation and read-only resolution. It must return a deliberately
  shaped response rather than private list tables.
- Resolve the owner of a valid shared-list URL before rendering. If that user is
  the list owner, replace the shared route with `lists/[id]`; all other viewers
  remain on the read-only shared route.
- Return shared-list items in bounded pages. The first response includes the
  list header, derived cover items, and an initial item page; later pages load
  only when needed.

## Out of Scope

- Browser-accessible pages, Universal Links, or an app-install fallback
- Rich previews in messaging apps
- Sharing a user's Journal, watch history, ratings, Notes, or reviews
- Public profiles or a public list directory
- Per-item list Notes in shared lists
- Recipient collaboration or editing on a shared list
- Link expiry, revocation, regeneration, analytics, or share counts
- Screenshots, generated share images, or social-network-specific templates

## Acceptance Criteria

1. A user can share a title from Title Details using the native share sheet.
2. A title URL uses the existing encoded route-ID contract; a TMDB movie source
   example is `revit://title/tmdb%3Amovie%3A550`.
3. Opening a valid title URL in an installed Revit app shows read-only title
   information when signed out, without an AuthGate redirect to Welcome.
4. Signed-out title resolution reads existing normalized media only and never
   invokes TMDB or upserts data.
5. After sign-in and required onboarding, a recipient returns to the exact
   shared title or shared-list destination.
6. A title URL never exposes the sharer's Journal data, rating, Notes, reviews,
   or lists.
7. A list owner can share a list from List Details using the native share
   sheet.
8. The first concurrent share attempts for one list produce one persistent
   share key.
9. A shared list is live: later changes to its name, description, and items are
   visible on a subsequent open or refresh.
10. A valid shared-list URL opens a read-only list for a signed-out recipient.
11. Opening a shared-list URL as its owner redirects to the normal editable
    List Details route.
12. Empty and default user-owned lists can be shared; an empty shared list has
    an explicit read-only empty state.
13. A signed-in recipient can open a shared-list item and save that title only
    to their own Journal or lists.
14. A shared list never exposes the owner's profile, Journal data, ratings,
    Notes, review text, or per-item list Notes.
15. A recipient cannot edit, add to, reorder, or remove items from a shared
    list.
16. Shared-list responses are shaped and paginated; large lists do not require
    loading every item or any private list joins.
17. An invalid, malformed, or deleted-list URL does not reveal private list
    information.
18. Existing private list ownership and Row Level Security behavior remain
    unchanged.
19. Shared routes work on both iOS and Android with Revit installed.

## Known Limitation

Because this is an app-only feature, a `revit://` URL has no browser fallback.
Recipients without Revit installed cannot view the shared content from the
link. Some messaging apps may also display an app-scheme URL as plain text
rather than a tappable link. Adding an HTTPS Universal Link or a public web
page would be a separate product and hosting decision.
