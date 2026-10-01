# TAR-197: v1.3.1 list sharing

- Product direction: Approved
- Implementation: Full feature authorized by the user in this conversation
- Target branch: `v1.3.1`
- Issue: https://linear.app/tarun495/issue/TAR-197/v131-share-lists
- The user explicitly authorized completing all steps in one PR, overriding this
  ticket's intermediate approval pauses for this request.
- Location follows the repository AGENTS.md requirement for new implementation notes.

## Delivered behavior

The existing Collection options header control contains `Share list`. A first
share creates a live read-only link, and later shares reuse it. Once enabled,
`Stop sharing` requires confirmation and revokes the link without deleting the
list. Sharing again creates a fresh link. The header displays `Shared by link`
instead of `Only you`; unresolved state never claims privacy inaccurately.

Recipients can browse before sign-in. Public cards show only source identity,
title, type, year, and image; no owner identity, list-item IDs, personal notes,
ratings, reviews, or Journal data is returned. Opening a card reuses Title Details.
The owner is redirected to the existing editable list. Sign-in and onboarding
retain the validated list destination using the existing auth continuation flow.

Empty/default lists work. Invalid, missing, revoked, and deleted links show the
same unavailable state. Network and server failures support retry. Revocation
on a later page removes rendered content; transient failures preserve useful
already-loaded items. Refresh/reopen fetches live content.

## Storage and access

`list_shares` has one row per list, a nullable unique 64-character lowercase hex
key, and a monotonic version. Keys come from 32 cryptographically random server
bytes. A revoked row retains its version and clears its key. List/profile/account
deletion cascades through existing relationships.

The table has RLS and no client grants/policies. The two SQL functions use
`SECURITY INVOKER`, an empty search path, and service-role-only EXECUTE grants.
Existing list/list-item policies stay owner-only. Edge handlers validate the
caller using `getUser`; management passes only that verified ID to SQL.

Management locks the parent list before reading/changing its grant. First-share
requests converge on one key. Mutations carry `expectedVersion`; stale creation
cannot restore a revoked grant, and stale stop cannot revoke a replacement link.
Repeated stop on an inactive grant is idempotent. Clients refetch after mutations
and report recoverable conflicts rather than silently retrying a mutation with a
new version.

The read-only resolver revalidates and share-locks the active grant on every page.
It returns up to 40 cards and four covers in position ascending (null last),
created date descending, ID ascending order. The visible count and covers use the
same eligibility filter. Games require the existing server capability flag and a
normalized snapshot stamped with `games-catalog-v1`. No provider fetch or catalog
write occurs. Eligibility policy changes must update this stamp filter alongside
the existing IGDB policy constant.

Pagination offsets are HMAC-SHA256 signed, bound to the grant, and limited to
100,000. They contain no private row IDs. Live edits can shift an offset; the
client deduplicates titles and refresh restarts pagination. This is a live view,
not a stable snapshot or real-time subscription.

All sharing HTTP responses use `Cache-Control: no-store`. Public queries have
zero stale/retention times, refetch on focus, and are separated by viewer identity.
Shared responses are not persisted for offline viewing. A per-isolate request
guard uses the existing bounded throttler; platform-level rate limiting remains
an additional deployment boundary. Handlers never log keys, tokens, cursor
contents, or arbitrary database exceptions.

## Deployment

1. Apply `20261001182254_list_sharing.sql` through the normal migration workflow.
2. Set `LIST_SHARE_CURSOR_SECRET` to a server-only random secret of at least 32
   characters. Do not use the placeholder in `.env.example`. Rotation invalidates
   outstanding pagination cursors; refreshing starts a new first page.
3. Deploy `list-sharing` and `shared-list` with the checked-in function settings.
   Both disable gateway JWT verification; management performs mandatory user
   verification inside its handler, and resolution permits anonymous reading.
4. Release the app build containing the new public list routes and controls.

No production migration, secret change, function deployment, or merge is part of
this PR creation request.

## Verification and remaining release checks

- URL/parser and auth-continuation tests, handler/privacy boundaries, signed
  cursor tests, owner-panel interaction tests, and recipient-screen tests.
- SQL regression script: `supabase/tests/list_sharing.sql`, executed in an
  isolated PostgreSQL database with repository baseline migrations/bootstrap.
- Database types generated using the Supabase CLI from that migrated database;
  only the new table/RPC blocks were incorporated into `lib/supabase/types.ts`.
- Full Jest suite, app/Edge TypeScript, ESLint, and Expo web export.
- Supabase security advisor against the isolated test database.
- Real concurrent SQL requests using `node scripts/verify-list-sharing-concurrency.cjs`
  verified first-share convergence, stop/create races, and stale stop after re-enable.

The full automated suite and additional API timeout tests passed. The web export
passed, SQL regression/concurrency checks passed, and the security advisor
reported no issues. Requests have a 10-second timeout with cancellation so an
unresponsive server does not leave the sharing UI busy indefinitely.

The full local Supabase stack failed its analytics-container health check;
isolated PostgreSQL verification covers the migration independently. Native
iOS/Android cold/warm deep links and real native share sheets still require
device verification before release. App-only `revit://` links have no browser or
install fallback and some messaging apps may display them as plain text.

Whole-list copying, recipient re-share UI, collaboration, public profiles, share
cards, expiry, analytics, and real-time sync remain outside this feature.
